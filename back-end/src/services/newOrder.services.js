// Service = "คนคุยกับฐานข้อมูล" + คำนวณยอดเงิน + กฎของระบบ
import createError from 'http-errors';
import { Prisma } from '@prisma/client';
import prisma from '../configs/prisma.config.js';
import { toDate } from '../utils/date.utils.js';
import { cleanText, normalizeSize, compareSize } from '../utils/text.utils.js';

const DEFAULT_MARGIN_RATE = '1.5'; // % ส่วนต่าง
const MAX_DECIMALS = 2;            // ตรงกับ @db.Decimal(..., 2) ใน schema
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

// เพดาน (กันตัวเลข/ข้อความเกินขนาดคอลัมน์ใน DB)
const LIMITS = {
  items: 50,            // ไซซ์ต่อ order
  weight: 1_000_000,    // กก. ต่อไซซ์
  pricePerKg: 100_000,  // บาท/กก.
  pondName: 100,        // ตัวอักษร
  size: 50,
  destination: 100,
  note: 191,
};

// ข้อความ: ตัดช่องว่าง + เช็กความยาว
function toText(value, fieldName, maxLength) {
  const text = cleanText(value);
  if (text && text.length > maxLength) {
    throw createError(400, `${fieldName} ยาวได้ไม่เกิน ${maxLength} ตัวอักษร`);
  }
  return text;
}

// ======================================================
// ตัวช่วยตรวจ/แปลงข้อมูล
// ======================================================

// แปลงเป็น Decimal (ใช้กับเงิน/น้ำหนักเสมอ ห้ามใช้ Number)
// กฎ: ต้องเป็นตัวเลข, ไม่ติดลบ, ทศนิยมไม่เกิน 2 ตำแหน่ง
function toDecimal(value, fieldName, { mustBePositive = false, max } = {}) {
  if (value === undefined || value === null || value === '') {
    // "แถวที่ 1: ราคา/กก." → "แถวที่ 1: ต้องกรอก ราคา/กก."
    const [prefix, label] = fieldName.includes(':') ? fieldName.split(': ') : ['', fieldName];
    throw createError(400, `${prefix ? `${prefix}: ` : ''}ต้องกรอก ${label}`);
  }
  if (typeof value !== 'string' && typeof value !== 'number' && !Prisma.Decimal.isDecimal(value)) {
    throw createError(400, `${fieldName} ต้องเป็นตัวเลข`);
  }

  // รับแค่ตัวเลขธรรมดา เช่น "1000", "490.70" (ไม่รับ "0x10", "1e3", "Infinity")
  if (typeof value === 'string' && !/^\d+(\.\d+)?$/.test(value.trim())) {
    throw createError(400, `${fieldName} ต้องเป็นตัวเลข เช่น 1000 หรือ 490.70`);
  }

  let d;
  try {
    d = new Prisma.Decimal(typeof value === 'string' ? value.trim() : value);
  } catch {
    throw createError(400, `${fieldName} ต้องเป็นตัวเลข`);
  }

  if (!d.isFinite()) throw createError(400, `${fieldName} ต้องเป็นตัวเลข`);
  if (d.isNegative()) throw createError(400, `${fieldName} ห้ามติดลบ`);
  if (mustBePositive && d.isZero()) throw createError(400, `${fieldName} ต้องมากกว่า 0`);
  if (d.decimalPlaces() > MAX_DECIMALS) {
    throw createError(400, `${fieldName} ทศนิยมได้ไม่เกิน ${MAX_DECIMALS} ตำแหน่ง`);
  }
  if (max !== undefined && d.greaterThan(max)) throw createError(400, `${fieldName} ต้องไม่เกิน ${max}`);
  return d;
}

// เงินปัดเป็นบาทเต็ม: สตางค์ ≥ 50 ปัดขึ้น, < 50 ปัดลง  (819,886.45 → 819,886 · 13,181.56 → 13,182)
const roundBaht = (d) => d.toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);

// ======================================================
// ข้อ 4: ชื่อที่เคยใช้แล้ว → ใช้การสะกดเดิม
//   "โรงงานก" / "โรงงาน  ก" / "โรงงาน ก" ถือเป็นชื่อเดียวกัน (ไม่สนช่องว่าง/ตัวพิมพ์เล็กใหญ่)
// ======================================================
const nameKey = (text) => text.replace(/\s+/g, '').toLowerCase();

function toNameMap(names) {
  const map = new Map();
  for (const name of names) if (!map.has(nameKey(name))) map.set(nameKey(name), name);
  return map;
}

// คืนการสะกดที่เคยใช้ ถ้าเป็นชื่อใหม่ → จำไว้ (กันแถวถัดไปใน order เดียวกันสะกดต่าง)
function canonical(text, map) {
  if (!text) return text;
  const key = nameKey(text);
  if (!map.has(key)) map.set(key, text);
  return map.get(key);
}

async function loadKnownNames(db) {
  const { sizes, destinations, pondNames } = await getOptions(db);
  return { sizes: toNameMap(sizes), destinations: toNameMap(destinations), pondNames: toNameMap(pondNames) };
}

// ======================================================
// กฎ: รายการที่ยกเลิก / ปิดเงินแล้ว ห้ามแก้
// ======================================================

async function getOrderOrThrow(tx, id) {
  const order = await tx.order.findUnique({ where: { id } });
  if (!order) throw createError(404, 'ไม่พบรายการนี้');
  return order;
}

function assertNotCancelled(order) {
  if (order.isCancelled) {
    throw createError(409, 'รายการนี้ถูกยกเลิกแล้ว ต้องกู้คืนก่อน');
  }
}

// ปิดเงินแล้ว = จ่ายเจ้าของบ่อแล้ว หรือ รับเงินจากที่ใดที่หนึ่งแล้ว (แม้ยังไม่ครบ)
async function assertNotSettled(tx, order) {
  const receivedSome = await tx.orderItem.count({ where: { orderId: order.id, isReceived: true } });
  if (order.isPaidToFarmer || receivedSome > 0) {
    throw createError(409, 'รายการนี้จ่าย/รับเงินแล้ว ต้องยกเลิกติ๊กก่อนถึงจะแก้หรือยกเลิกรายการได้');
  }
}

// ======================================================
// ส่วนคำนวณ: body จากผู้ใช้ → ข้อมูลพร้อมบันทึก
// current = ข้อมูลเดิม (ตอนแก้ไข) ใช้เป็นค่าเริ่มต้นของส่วนต่าง
// ======================================================
function buildOrderData(body, current, known) {
  const pondName = canonical(
    typeof body.pondName === 'string' ? toText(body.pondName, 'ชื่อบ่อ', LIMITS.pondName) : null,
    known.pondNames,
  );
  if (!pondName) throw createError(400, 'ต้องกรอก ชื่อบ่อ');

  const items = body.items;
  if (!Array.isArray(items) || items.length === 0) {
    throw createError(400, 'ต้องมีไซซ์อย่างน้อย 1 แถว');
  }
  if (items.length > LIMITS.items) {
    throw createError(400, `ใส่ไซซ์ได้ไม่เกิน ${LIMITS.items} แถวต่อ order`);
  }

  let totalWeight = new Prisma.Decimal(0);
  let totalAmount = new Prisma.Decimal(0);
  const seenSizes = new Set();

  const rows = items.map((item, i) => {
    const row = `แถวที่ ${i + 1}:`; // ใช้ในข้อความ error ให้ผู้ใช้รู้ว่าผิดแถวไหน
    const size = canonical(normalizeSize(item?.size), known.sizes); // "66 - 70" → "66-70"
    if (!size) throw createError(400, `${row} ต้องกรอก ไซซ์`);
    if (size.length > LIMITS.size) throw createError(400, `${row} ไซซ์ ยาวได้ไม่เกิน ${LIMITS.size} ตัวอักษร`);
    if (seenSizes.has(size)) throw createError(400, `${row} ไซซ์ ${size} ซ้ำกับแถวก่อนหน้า`);
    seenSizes.add(size);

    const weight = toDecimal(item.weight, `${row} น้ำหนัก`, { mustBePositive: true, max: LIMITS.weight });
    const pricePerKg = toDecimal(item.pricePerKg, `${row} ราคา/กก.`, { max: LIMITS.pricePerKg });
    const amount = roundBaht(weight.mul(pricePerKg)); // น้ำหนัก × ราคา (ปัดเป็นบาท)

    totalWeight = totalWeight.add(weight);
    totalAmount = totalAmount.add(amount);

    const destination = canonical(toText(item.destination, `${row} ปลายทาง`, LIMITS.destination), known.destinations);
    return { size, destination, weight, pricePerKg, amount };
  });

  // ส่วนต่าง (หักออกจากยอด): ไม่ส่งมา → ใช้ค่าเดิม (ตอนแก้ไข) หรือค่าเริ่มต้น (ตอนสร้าง)
  if (body.includeMargin !== undefined && typeof body.includeMargin !== 'boolean') {
    throw createError(400, 'หักส่วนต่าง ต้องเป็น true หรือ false');
  }
  const includeMargin = body.includeMargin ?? current?.includeMargin ?? false;
  const marginRate = toDecimal(
    body.marginRate ?? current?.marginRate ?? DEFAULT_MARGIN_RATE,
    'ส่วนต่าง %',
    { max: 100 },
  );
  const marginAmount = includeMargin
    ? roundBaht(totalAmount.mul(marginRate).div(100)) // ยอดรวม × 1.5% = ส่วนที่หักเป็นของเรา (ปัดเป็นบาท)
    : new Prisma.Decimal(0);                        // ไม่หัก = 0
  const grandTotal = totalAmount.sub(marginAmount); // ยอดรวม − ส่วนต่าง = ยอดจ่ายเจ้าของบ่อ

  return {
    order: {
      orderDate: toDate(body.orderDate, 'วันที่', true),
      pondName,
      note: toText(body.note, 'หมายเหตุ', LIMITS.note),
      totalWeight,
      totalAmount,
      includeMargin,
      marginRate,
      marginAmount,
      grandTotal,
    },
    items: rows,
  };
}

// ======================================================
// อ่านข้อมูล
// ======================================================

const includeItems = { items: { orderBy: { id: 'asc' } } };

const findWithItems = (tx, id) => tx.order.findUnique({ where: { id }, include: includeItems });

// ดูรายการ (กรองตามวัน + แบ่งหน้า) — ไม่แสดงรายการที่ยกเลิก
// query: { date, page, pageSize }
export async function findAll(query = {}) {
  const where = { isCancelled: false };
  if (query.date) where.orderDate = toDate(query.date, 'วันที่');

  const page = query.page ?? 1;
  const pageSize = Math.min(query.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

  // ดึงข้อมูลหน้านี้ + นับจำนวนทั้งหมด พร้อมกัน
  const [data, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      include: includeItems,
      orderBy: [{ orderDate: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return { data, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

// รายการที่ยกเลิกของวันนั้น (ไว้กู้คืน) — ไม่แบ่งหน้า
export function findCancelled(date) {
  return prisma.order.findMany({
    where: { isCancelled: true, orderDate: toDate(date, 'วันที่', true) },
    include: includeItems,
    orderBy: { cancelledAt: 'desc' },
  });
}

export function findById(id) {
  return findWithItems(prisma, id);
}

// ตัวเลือกที่เคยกรอกแล้ว (ให้ front-end ทำช่องเลือก/เติมคำอัตโนมัติ กันพิมพ์ไม่ตรงกัน)
export async function getOptions(db = prisma) {
  const [sizes, destinations, ponds] = await Promise.all([
    db.orderItem.findMany({ distinct: ['size'], select: { size: true } }),
    db.orderItem.findMany({
      distinct: ['destination'],
      select: { destination: true },
      where: { destination: { not: null } },
    }),
    db.order.findMany({ distinct: ['pondName'], select: { pondName: true } }),
  ]);

  return {
    sizes: sizes.map((x) => x.size).sort(compareSize),
    destinations: destinations.map((x) => x.destination).sort((a, b) => a.localeCompare(b, 'th')),
    pondNames: ponds.map((x) => x.pondName).sort((a, b) => a.localeCompare(b, 'th')),
  };
}

// ======================================================
// เพิ่ม / แก้ / ยกเลิก
// ======================================================

// เพิ่ม order + ไซซ์ทั้งหมด ในคำสั่งเดียว
export async function create(body) {
  const { order, items } = buildOrderData(body, null, await loadKnownNames(prisma));
  return prisma.order.create({
    data: { ...order, items: { create: items } },
    include: includeItems,
  });
}

// แก้ไข: ส่งข้อมูลทั้งชุด → ลบไซซ์เก่า ใส่ไซซ์ใหม่ คำนวณยอดใหม่
// ห้ามแก้ถ้า ยกเลิกแล้ว หรือ จ่าย/รับเงินแล้ว
export function update(id, body) {
  return prisma.$transaction(async (tx) => {
    const current = await getOrderOrThrow(tx, id);
    assertNotCancelled(current);
    await assertNotSettled(tx, current);

    const { order, items } = buildOrderData(body, current, await loadKnownNames(tx));
    return tx.order.update({
      where: { id },
      data: { ...order, items: { deleteMany: {}, create: items } },
      include: includeItems,
    });
  });
}

// ยกเลิก (แทนการลบจริง) — ห้ามยกเลิกถ้าจ่าย/รับเงินแล้ว
export function cancel(id) {
  return prisma.$transaction(async (tx) => {
    const current = await getOrderOrThrow(tx, id);
    if (current.isCancelled) return findWithItems(tx, id);
    await assertNotSettled(tx, current);

    return tx.order.update({
      where: { id },
      data: { isCancelled: true, cancelledAt: new Date() },
      include: includeItems,
    });
  });
}

// กู้คืนรายการที่ยกเลิก
export function restore(id) {
  return prisma.$transaction(async (tx) => {
    const current = await getOrderOrThrow(tx, id);
    if (!current.isCancelled) return findWithItems(tx, id);

    return tx.order.update({
      where: { id },
      data: { isCancelled: false, cancelledAt: null },
      include: includeItems,
    });
  });
}

// ======================================================
// ปุ่มเช็กเงิน
// - กดซ้ำค่าเดิม → ไม่เปลี่ยนอะไร (เวลาที่กดครั้งแรกไม่หาย)
// - รายการที่ยกเลิกแล้ว กดไม่ได้
// ======================================================

// ปุ่ม "จ่ายเจ้าของบ่อแล้ว" (1 ปุ่มต่อ order)
export function setPaidToFarmer(id, checked) {
  return prisma.$transaction(async (tx) => {
    const current = await getOrderOrThrow(tx, id);
    assertNotCancelled(current);

    if (current.isPaidToFarmer === checked) return findWithItems(tx, id);

    return tx.order.update({
      where: { id },
      data: { isPaidToFarmer: checked, paidToFarmerAt: checked ? new Date() : null },
      include: includeItems,
    });
  });
}

// ปุ่ม "ได้รับเงินแล้ว" (1 ปุ่มต่อปลายทาง)
// destination: "โรงงาน ก" = เฉพาะที่นั้น · null = ไซซ์ที่ไม่ระบุปลายทาง · undefined = ทุกปลายทางใน order
export function setReceived(id, checked, destination) {
  return prisma.$transaction(async (tx) => {
    const current = await getOrderOrThrow(tx, id);
    assertNotCancelled(current);

    const target = { orderId: id };
    if (destination !== undefined) {
      target.destination = destination;
      const found = await tx.orderItem.count({ where: target });
      if (!found) throw createError(400, `order นี้ไม่มีปลายทาง "${destination ?? 'ไม่ระบุ'}"`);
    }

    // เปลี่ยนเฉพาะแถวที่ยังไม่ใช่ค่าที่ต้องการ → แถวที่ติ๊กไว้แล้ว เวลาเดิมไม่หาย
    await tx.orderItem.updateMany({
      where: { ...target, isReceived: !checked },
      data: { isReceived: checked, receivedAt: checked ? new Date() : null },
    });

    // สรุปกลับไปที่ order: รับครบทุกปลายทางแล้วหรือยัง
    const pending = await tx.orderItem.count({ where: { orderId: id, isReceived: false } });
    const allReceived = pending === 0;
    const latest = allReceived
      ? await tx.orderItem.aggregate({ where: { orderId: id }, _max: { receivedAt: true } })
      : null;

    return tx.order.update({
      where: { id },
      data: { isReceived: allReceived, receivedAt: latest?._max.receivedAt ?? null },
      include: includeItems,
    });
  });
}
