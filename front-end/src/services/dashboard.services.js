// Dashboard = สรุปตัวเลข (อ่านอย่างเดียว ไม่แก้ข้อมูล)
import { Prisma } from '@prisma/client';
import prisma from '../configs/prisma.config.js';
import { toDate, todayInBangkok } from '../utils/date.utils.js';
import { compareSize } from '../utils/text.utils.js';

// ผลรวมจาก DB ถ้าไม่มีข้อมูลจะได้ null → เปลี่ยนเป็น 0
const zeroIfNull = (value) => new Prisma.Decimal(value ?? 0);

// ราคาเฉลี่ย/กก. = ยอดเงิน ÷ น้ำหนัก
const avgPrice = (amount, weight) =>
  weight.isZero() ? new Prisma.Decimal(0) : amount.div(weight).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

// date = "2026-10-10" (ไม่ส่ง = วันนี้ตามเวลาไทย)
export async function getDailySummary(dateText) {
  const date = dateText ?? todayInBangkok();
  const orderDate = toDate(date, 'date', true);

  const activeOrders = { isCancelled: false };              // ไม่นับที่ยกเลิก
  const ordersOfDay = { ...activeOrders, orderDate };       // order ของวันนี้
  const itemsOfDay = { order: ordersOfDay };                // ไซซ์ใน order ของวันนี้

  const [day, sizes, destinations, unpaid, unreceived] = await Promise.all([
    // 1) ยอดรวมของวัน
    prisma.order.aggregate({
      where: ordersOfDay,
      _count: { _all: true },
      _sum: { totalWeight: true, totalAmount: true, marginAmount: true, grandTotal: true },
    }),

    // 2) สรุปตามไซซ์ของวัน (Summary Size Price)
    prisma.orderItem.groupBy({
      by: ['size'],
      where: itemsOfDay,
      _count: { _all: true },
      _sum: { weight: true, amount: true },
    }),

    // 3) สรุปตามปลายทางของวัน
    prisma.orderItem.groupBy({
      by: ['destination'],
      where: itemsOfDay,
      _sum: { weight: true, amount: true },
    }),

    // 4) ค้างจ่ายเจ้าของบ่อ (ทุกวัน ไม่ใช่แค่วันนี้)
    prisma.order.aggregate({
      where: { ...activeOrders, isPaidToFarmer: false },
      _count: { _all: true },
      _sum: { totalAmount: true },
    }),

    // 5) ค้างรับเงิน (ทุกวัน ไม่ใช่แค่วันนี้)
    prisma.order.aggregate({
      where: { ...activeOrders, isReceived: false },
      _count: { _all: true },
      _sum: { grandTotal: true },
    }),
  ]);

  return {
    date,

    // ---- ของวันนี้ ----
    day: {
      orderCount: day._count._all,                     // วันนี้มีกี่ order
      totalWeight: zeroIfNull(day._sum.totalWeight),   // น้ำหนักรวม
      totalAmount: zeroIfNull(day._sum.totalAmount),   // ยอดจ่ายเจ้าของบ่อรวม
      marginAmount: zeroIfNull(day._sum.marginAmount), // ส่วนต่างที่ได้
      grandTotal: zeroIfNull(day._sum.grandTotal),     // ยอดที่ต้องเก็บรวม
    },

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
        destination: d.destination ?? 'ไม่ระบุ',
        totalWeight: zeroIfNull(d._sum.weight),
        totalAmount: zeroIfNull(d._sum.amount),
      }))
      .sort((a, b) => b.totalAmount.comparedTo(a.totalAmount)),

    // ---- ค้างทั้งหมด (สะสมทุกวัน) ----
    outstanding: {
      payToFarmer: {                                    // ยังไม่จ่ายเจ้าของบ่อ
        orderCount: unpaid._count._all,
        amount: zeroIfNull(unpaid._sum.totalAmount),
      },
      receive: {                                        // ยังไม่ได้รับเงิน
        orderCount: unreceived._count._all,
        amount: zeroIfNull(unreceived._sum.grandTotal),
      },
    },
  };
}
