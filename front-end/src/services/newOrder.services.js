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
    throw createError(400, `ต้องกรอก ${fieldName}`);
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

const round2 = (d) => d.toDecimalPlaces(MAX_DECIMALS, Prisma.Decimal.ROUND_HALF_UP);

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

function assertNotSettled(order) {
  if (order.isPaidToFarmer || order.isReceived) {
    throw createError(409, 'รายการนี้จ่าย/รับเงินแล้ว ต้องยกเลิกติ๊กก่อนถึงจะแก้หรือยกเลิกรายการได้');
  }
}

// ======================================================
// ส่วนคำนวณ: body จากผู้ใช้ → ข้อมูลพร้อมบันทึก
// current = ข้อมูลเดิม (ตอนแก้ไข) ใช้เป็นค่าเริ่มต้นของส่วนต่าง
// ======================================================
function buildOrderData(body, current = null) {
  const pondName = typeof body.pondName === 'string' ? toText(body.pondName, 'pondName', LIMITS.pondName) : null;
  if (!pondName) throw createError(400, 'ต้องกรอก pondName (ชื่อบ่อ)');

  const items = body.items;
  if (!Array.isArray(items) || items.length === 0) {
    throw createError(400, 'ต้องมี items (ไซซ์) อย่างน้อย 1 แถว');
  }
  if (items.length > LIMITS.items) {
    throw createError(400, `ใส่ไซซ์ได้ไม่เกิน ${LIMITS.items} แถวต่อ order`);
  }

  let totalWeight = new Prisma.Decimal(0);
  let totalAmount = new Prisma.Decimal(0);
  const seenSizes = new Set();

  const rows = items.map((item, i) => {
    const size = normalizeSize(item?.size); // "66 - 70" → "66-70"
    if (!size) throw createError(400, `items[${i}] ต้องมี size`);
    if (size.length > LIMITS.size) throw createError(400, `items[${i}].size ยาวได้ไม่เกิน ${LIMITS.size} ตัวอักษร`);
    if (seenSizes.has(size)) throw createError(400, `ไซซ์ ${size} ซ้ำในรายการเดียวกัน`);
    seenSizes.add(size);

    const weight = toDecimal(item.weight, `items[${i}].weight`, { mustBePositive: true, max: LIMITS.weight });
    const pricePerKg = toDecimal(item.pricePerKg, `items[${i}].pricePerKg`, { max: LIMITS.pricePerKg });
    const amount = round2(weight.mul(pricePerKg)); // น้ำหนัก × ราคา

    totalWeight = totalWeight.add(weight);
    totalAmount = totalAmount.add(amount);

    const destination = toText(item.destination, `items[${i}].destination`, LIMITS.destination);
    return { size, destination, weight, pricePerKg, amount };
  });

  // ส่วนต่าง: ไม่ส่งมา → ใช้ค่าเดิม (ตอนแก้ไข) หรือค่าเริ่มต้น (ตอนสร้าง)
  if (body.includeMargin !== undefined && typeof body.includeMargin !== 'boolean') {
    throw createError(400, 'includeMargin ต้องเป็น true หรือ false');
  }
  const includeMargin = body.includeMargin ?? current?.includeMargin ?? false;
  const marginRate = toDecimal(
    body.marginRate ?? current?.marginRate ?? DEFAULT_MARGIN_RATE,
    'marginRate',
    { max: 100 },
  );
  const marginAmount = includeMargin
    ? round2(totalAmount.mul(marginRate).div(100)) // ยอดรวม × 1.5%
    : new Prisma.Decimal(0);                        // ไม่บวก = 0
  const grandTotal = totalAmount.add(marginAmount);

  return {
    order: {
      orderDate: toDate(body.orderDate, 'orderDate', true),
      pondName,
      note: toText(body.note, 'note', LIMITS.note),
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
  if (query.date) where.orderDate = toDate(query.date, 'date');

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

export function findById(id) {
  return findWithItems(prisma, id);
}

// ตัวเลือกที่เคยกรอกแล้ว (ให้ front-end ทำช่องเลือก/เติมคำอัตโนมัติ กันพิมพ์ไม่ตรงกัน)
export async function getOptions() {
  const [sizes, destinations, ponds] = await Promise.all([
    prisma.orderItem.findMany({ distinct: ['size'], select: { size: true } }),
    prisma.orderItem.findMany({
      distinct: ['destination'],
      select: { destination: true },
      where: { destination: { not: null } },
    }),
    prisma.order.findMany({ distinct: ['pondName'], select: { pondName: true } }),
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
export function create(body) {
  const { order, items } = buildOrderData(body);
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
    assertNotSettled(current);

    const { order, items } = buildOrderData(body, current);
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
    assertNotSettled(current);

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
// 2 ปุ่มเช็ก
// - กดซ้ำค่าเดิม → ไม่เปลี่ยนอะไร (เวลาที่กดครั้งแรกไม่หาย)
// - รายการที่ยกเลิกแล้ว กดไม่ได้
// ======================================================
function setFlag(id, checked, flagField, timeField) {
  return prisma.$transaction(async (tx) => {
    const current = await getOrderOrThrow(tx, id);
    assertNotCancelled(current);

    if (current[flagField] === checked) return findWithItems(tx, id);

    return tx.order.update({
      where: { id },
      data: { [flagField]: checked, [timeField]: checked ? new Date() : null },
      include: includeItems,
    });
  });
}

// ปุ่ม "จ่ายเจ้าของบ่อแล้ว"
export const setPaidToFarmer = (id, checked) =>
  setFlag(id, checked, 'isPaidToFarmer', 'paidToFarmerAt');

// ปุ่ม "ได้รับเงินแล้ว"
export const setReceived = (id, checked) =>
  setFlag(id, checked, 'isReceived', 'receivedAt');
