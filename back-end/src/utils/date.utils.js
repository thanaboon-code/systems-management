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

// เดือนนี้ตามเวลาไทย → "2026-11"
export function thisMonthInBangkok() {
  return todayInBangkok().slice(0, 7);
}

// "2026-10" → ช่วงวันของเดือนนั้น { from: 2026-10-01, to: 2026-11-01 (ไม่รวม) }
export function monthRange(value) {
  if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    throw createError(400, 'เดือน ต้องเป็นรูปแบบ YYYY-MM เช่น 2026-10');
  }
  const [year, month] = value.split('-').map(Number);
  return {
    from: new Date(Date.UTC(year, month - 1, 1)),
    to: new Date(Date.UTC(year, month, 1)), // วันแรกของเดือนถัดไป
  };
}
