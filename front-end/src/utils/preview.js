// คำนวณยอด "ตัวอย่าง" ระหว่างกรอกฟอร์ม (ให้ผู้ใช้เห็นทันที)
// ยอดจริงที่บันทึกใช้ของ back-end เสมอ — สูตรต้องตรงกับ back-end:
//   ยอดแต่ละแถว = น้ำหนัก × ราคา ปัดเป็นบาทเต็ม (สตางค์ ≥ 50 ขึ้น, < 50 ลง)
//   ส่วนต่าง     = ยอดรวม × % ปัดเป็นบาทเต็ม
// คิดด้วยจำนวนเต็ม (สตางค์) เพื่อเลี่ยงทศนิยมเพี้ยนของ JavaScript (0.1 + 0.2 = 0.30000000000000004)

const toCents = (value) => {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : 0
}

// ยอด 1 แถว (บาทเต็ม)
// สตางค์ของน้ำหนัก × สตางค์ของราคา = ยอด × 10,000 → หาร 10,000 แล้วปัด
export const rowAmount = (weight, pricePerKg) =>
  Math.round((toCents(weight) * toCents(pricePerKg)) / 10000)

// รวมทั้งฟอร์ม → บาท (number) ไว้แสดงผล
export function previewTotals(items, includeMargin, marginRate) {
  let weightCents = 0
  let totalAmount = 0
  for (const item of items) {
    weightCents += toCents(item.weight)
    totalAmount += rowAmount(item.weight, item.pricePerKg)
  }
  const rateCents = toCents(marginRate) // 1.5% → 150
  const marginAmount = includeMargin ? Math.round((totalAmount * rateCents) / 10000) : 0

  return {
    totalWeight: weightCents / 100,
    totalAmount,
    marginAmount,
    grandTotal: totalAmount - marginAmount, // ยอดรวม − ส่วนต่าง = จ่ายเจ้าของบ่อ
  }
}
