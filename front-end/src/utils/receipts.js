// ตัวช่วยเรื่องรับเงินแยกตามปลายทาง

// จัดกลุ่มไซซ์ของ order ตามปลายทาง → 1 กลุ่ม = 1 ปุ่ม "ได้รับเงินแล้ว"
// คืน [{ destination, label, amount, isReceived, receivedAt }]
export function groupReceipts(order) {
  const groups = new Map()
  for (const item of order.items) {
    const key = item.destination ?? null
    if (!groups.has(key)) {
      groups.set(key, {
        destination: key,                       // ค่าที่ส่งไป API (null = ไม่ระบุปลายทาง)
        label: key ?? 'ไม่ระบุปลายทาง',
        cents: 0,
        isReceived: true,
        receivedAt: null,
      })
    }
    const g = groups.get(key)
    g.cents += Math.round(Number(item.amount) * 100) // ใช้แสดงผลเท่านั้น
    g.isReceived = g.isReceived && item.isReceived
    if (item.receivedAt && (!g.receivedAt || item.receivedAt > g.receivedAt)) g.receivedAt = item.receivedAt
  }
  return [...groups.values()].map(({ cents, ...g }) => ({ ...g, amount: cents / 100 }))
}

// ปิดเงินแล้ว (แก้/ยกเลิกไม่ได้) = จ่ายเจ้าของบ่อแล้ว หรือ รับเงินจากที่ใดที่หนึ่งแล้ว
export const isSettled = (order) => order.isPaidToFarmer || order.items.some((item) => item.isReceived)
