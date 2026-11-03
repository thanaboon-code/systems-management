// Dashboard = สรุปตัวเลข (อ่านอย่างเดียว ไม่แก้ข้อมูล)
//
// ความหมายของยอด
//   totalAmount  = ยอดที่ต้องเก็บ (รวมตามไซซ์)
//   marginAmount = ส่วนต่างที่ได้ (หักไว้)
//   grandTotal   = ยอดจ่ายเจ้าของบ่อ
import { Prisma } from '@prisma/client';
import prisma from '../configs/prisma.config.js';
import { toDate, todayInBangkok, thisMonthInBangkok, monthRange } from '../utils/date.utils.js';
import { compareSize } from '../utils/text.utils.js';

const NO_DESTINATION = 'ไม่ระบุ';
const activeOrders = { isCancelled: false }; // ไม่นับที่ยกเลิก

// ผลรวมจาก DB ถ้าไม่มีข้อมูลจะได้ null → เปลี่ยนเป็น 0
const zeroIfNull = (value) => new Prisma.Decimal(value ?? 0);

// ราคาเฉลี่ย/กก. = ยอดเงิน ÷ น้ำหนัก
const avgPrice = (amount, weight) =>
  weight.isZero() ? new Prisma.Decimal(0) : amount.div(weight).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

const sumFields = { totalWeight: true, totalAmount: true, marginAmount: true, grandTotal: true };

// แปลงผลรวมของ order → ตัวเลขสรุป
const toTotals = (agg) => ({
  orderCount: agg._count._all,
  totalWeight: zeroIfNull(agg._sum.totalWeight),
  totalAmount: zeroIfNull(agg._sum.totalAmount),
  marginAmount: zeroIfNull(agg._sum.marginAmount),
  grandTotal: zeroIfNull(agg._sum.grandTotal),
});

// ======================================================
// สรุปของช่วงเวลาหนึ่ง (ใช้ทั้งรายวันและรายเดือน)
// orderWhere = เงื่อนไขเลือก order เช่น { orderDate: วันนั้น }
// ======================================================
async function summarize(orderWhere) {
  const where = { ...activeOrders, ...orderWhere };

  const [totals, sizes, destinations] = await Promise.all([
    prisma.order.aggregate({ where, _count: { _all: true }, _sum: sumFields }),

    // สรุปตามไซซ์ (Summary Size Price)
    prisma.orderItem.groupBy({
      by: ['size'],
      where: { order: where },
      _count: { _all: true },
      _sum: { weight: true, amount: true },
    }),

    // สรุปตามปลายทาง
    prisma.orderItem.groupBy({
      by: ['destination'],
      where: { order: where },
      _sum: { weight: true, amount: true },
    }),
  ]);

  return {
    totals: toTotals(totals),

    sizes: sizes
      .map((s) => {
        const weight = zeroIfNull(s._sum.weight);
        const amount = zeroIfNull(s._sum.amount);
        return {
          size: s.size,
          orderCount: s._count._all,
          totalWeight: weight,
          totalAmount: amount,
          avgPricePerKg: avgPrice(amount, weight),
        };
      })
      .sort((a, b) => compareSize(a.size, b.size)),

    destinations: destinations
      .map((d) => ({
        destination: d.destination ?? NO_DESTINATION,
        totalWeight: zeroIfNull(d._sum.weight),
        totalAmount: zeroIfNull(d._sum.amount),
      }))
      .sort((a, b) => b.totalAmount.comparedTo(a.totalAmount)),
  };
}

// ยอดค้างสะสมทุกวัน
async function getOutstanding() {
  const [unpaid, unreceivedSum, unreceivedOrders] = await Promise.all([
    // ค้างจ่ายเจ้าของบ่อ = ยอดหลังหักส่วนต่าง
    prisma.order.aggregate({
      where: { ...activeOrders, isPaidToFarmer: false },
      _count: { _all: true },
      _sum: { grandTotal: true },
    }),
    // ค้างรับเงิน = ยอดไซซ์ที่ยังไม่ได้รับ (รับแยกตามปลายทาง)
    prisma.orderItem.aggregate({
      where: { isReceived: false, order: activeOrders },
      _sum: { amount: true },
    }),
    prisma.order.count({
      where: { ...activeOrders, items: { some: { isReceived: false } } },
    }),
  ]);

  return {
    payToFarmer: { orderCount: unpaid._count._all, amount: zeroIfNull(unpaid._sum.grandTotal) },
    receive: { orderCount: unreceivedOrders, amount: zeroIfNull(unreceivedSum._sum.amount) },
  };
}

// ======================================================
// 1) รายวัน — GET /api/dashboard?date=2026-10-10
// ======================================================
export async function getDailySummary(dateText) {
  const date = dateText ?? todayInBangkok();
  const orderDate = toDate(date, 'วันที่', true);

  const [summary, outstanding] = await Promise.all([summarize({ orderDate }), getOutstanding()]);

  return {
    date,
    day: summary.totals,
    sizes: summary.sizes,
    destinations: summary.destinations,
    outstanding,
  };
}

// ======================================================
// 2) รายเดือน — GET /api/dashboard/monthly?month=2026-10
// ======================================================
export async function getMonthlySummary(monthText) {
  const month = monthText ?? thisMonthInBangkok();
  const { from, to } = monthRange(month);
  const inMonth = { orderDate: { gte: from, lt: to } };

  const [summary, perDay] = await Promise.all([
    summarize(inMonth),

    // แยกรายวัน (เฉพาะวันที่มี order)
    prisma.order.groupBy({
      by: ['orderDate'],
      where: { ...activeOrders, ...inMonth },
      _count: { _all: true },
      _sum: sumFields,
      orderBy: { orderDate: 'asc' },
    }),
  ]);

  return {
    month,
    totals: summary.totals,
    days: perDay.map((d) => ({
      date: d.orderDate.toISOString().slice(0, 10),
      ...toTotals(d),
    })),
    sizes: summary.sizes,
    destinations: summary.destinations,
  };
}

// ======================================================
// 3) ค้างรับแยกตามโรงงาน/ปลายทาง — GET /api/dashboard/receivables
//    นับไซซ์ที่ยังไม่ได้ติ๊ก "ได้รับเงินแล้ว" ของปลายทางนั้น (ทุกวัน)
// ======================================================
export async function getReceivables() {
  const items = await prisma.orderItem.findMany({
    where: { isReceived: false, order: activeOrders },
    select: {
      destination: true,
      weight: true,
      amount: true,
      order: { select: { id: true, orderDate: true, pondName: true } },
    },
  });

  // รวมตามปลายทาง
  const groups = new Map();
  for (const item of items) {
    const name = item.destination ?? NO_DESTINATION;
    if (!groups.has(name)) {
      groups.set(name, { destination: name, destinationKey: item.destination, amount: new Prisma.Decimal(0), weight: new Prisma.Decimal(0), orders: new Map() });
    }
    const g = groups.get(name);
    g.amount = g.amount.add(item.amount);
    g.weight = g.weight.add(item.weight);

    // order เดียวกันส่งหลายไซซ์ไปที่เดียวกัน → รวมเป็นแถวเดียว
    const o = item.order;
    const row = g.orders.get(o.id) ?? {
      orderId: o.id,
      orderDate: o.orderDate.toISOString().slice(0, 10),
      pondName: o.pondName,
      amount: new Prisma.Decimal(0),
    };
    row.amount = row.amount.add(item.amount);
    g.orders.set(o.id, row);
  }

  const destinations = [...groups.values()]
    .map((g) => {
      const orders = [...g.orders.values()].sort((a, b) => a.orderDate.localeCompare(b.orderDate) || a.orderId - b.orderId);
      return {
        destination: g.destination,
        destinationKey: g.destinationKey, // ค่าจริงที่ใช้ส่งไปติ๊กรับเงิน (null = ไม่ระบุปลายทาง)
        amount: g.amount,
        totalWeight: g.weight,
        orderCount: orders.length,
        oldestDate: orders[0]?.orderDate ?? null, // ค้างนานสุดตั้งแต่วันไหน
        orders,
      };
    })
    .sort((a, b) => b.amount.comparedTo(a.amount)); // ค้างมากสุดขึ้นก่อน

  const total = destinations.reduce((sum, d) => sum.add(d.amount), new Prisma.Decimal(0));

  return { total, destinations };
}

// ======================================================
// 4) ค้างจ่ายแยกตามบ่อ — GET /api/dashboard/payables
//    order ที่ยังไม่ได้ติ๊ก "จ่ายเจ้าของบ่อแล้ว" (ทุกวัน) · ยอด = grandTotal (หลังหักส่วนต่าง)
// ======================================================
export async function getPayables() {
  const orders = await prisma.order.findMany({
    where: { ...activeOrders, isPaidToFarmer: false },
    select: { id: true, orderDate: true, pondName: true, totalWeight: true, grandTotal: true },
    orderBy: [{ orderDate: 'asc' }, { id: 'asc' }],
  });

  const groups = new Map();
  for (const o of orders) {
    if (!groups.has(o.pondName)) {
      groups.set(o.pondName, { pondName: o.pondName, amount: new Prisma.Decimal(0), totalWeight: new Prisma.Decimal(0), orders: [] });
    }
    const g = groups.get(o.pondName);
    g.amount = g.amount.add(o.grandTotal);
    g.totalWeight = g.totalWeight.add(o.totalWeight);
    g.orders.push({ orderId: o.id, orderDate: o.orderDate.toISOString().slice(0, 10), amount: o.grandTotal });
  }

  const ponds = [...groups.values()]
    .map((g) => ({
      pondName: g.pondName,
      amount: g.amount,
      totalWeight: g.totalWeight,
      orderCount: g.orders.length,
      oldestDate: g.orders[0]?.orderDate ?? null, // ค้างนานสุดตั้งแต่วันไหน
      orders: g.orders,
    }))
    .sort((a, b) => b.amount.comparedTo(a.amount)); // ค้างมากสุดขึ้นก่อน

  const total = ponds.reduce((sum, p) => sum.add(p.amount), new Prisma.Decimal(0));
  return { total, ponds };
}
