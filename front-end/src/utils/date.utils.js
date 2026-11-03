// ตัวช่วยเรื่องวันที่ (ใช้ร่วมกันหลายไฟล์)
import createError from 'http-errors';

// วันนี้ตามเวลาไทย → "2026-11-01"
export function todayInBangkok() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
}

// "2026-10-10" → Date  และเช็กว่าเป็นวันที่มีอยู่จริง (กัน 2026-02-31)
export function toDate(value, fieldName, required = false) {
  if (value === undefined || value === null || value === '') {
    if (required) throw createError(400, `ต้องกรอก ${fieldName}`);
    return null;
  }
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw createError(400, `${fieldName} ต้องเป็นรูปแบบ YYYY-MM-DD`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  // JS เลื่อน 2026-02-31 ไปเป็น 2026-03-03 เอง → แปลงกลับแล้วต้องได้ค่าเดิม
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw createError(400, `${fieldName} ไม่มีวันนี้จริง (${value})`);
  }
  return date;
}
