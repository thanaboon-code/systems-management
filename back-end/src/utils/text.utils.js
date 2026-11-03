// ตัวช่วยจัดรูปแบบข้อความ ให้ข้อมูลที่ความหมายเดียวกันเขียนเหมือนกัน
// (ไม่งั้น "66-70" กับ "66 - 70" จะถูกนับเป็นคนละไซซ์ใน Dashboard)

// ตัดช่องว่างหัวท้าย + ช่องว่างซ้อนให้เหลือ 1 ช่อง
export function cleanText(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text === '' ? null : text;
}

// ไซซ์: "66 - 70" / "66–70" / "66~70" → "66-70"
export function normalizeSize(value) {
  const text = cleanText(value);
  if (!text) return null;
  return text
    .replace(/[–—~]/g, '-')     // ขีดแบบอื่น → "-"
    .replace(/\s*-\s*/g, '-');  // ตัดช่องว่างรอบขีด
}

// เรียงไซซ์ตามตัวเลขหน้า: 40-50, 66-70, 96-100, 100-120 (ไม่ใช่เรียงแบบตัวอักษร)
export function compareSize(a, b) {
  const na = parseFloat(a);
  const nb = parseFloat(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
  if (Number.isNaN(na) !== Number.isNaN(nb)) return Number.isNaN(na) ? 1 : -1; // ไซซ์ที่ไม่ใช่ตัวเลขไว้ท้าย
  return String(a).localeCompare(String(b), 'th');
}
