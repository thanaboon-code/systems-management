// ตัวช่วยแสดงผล — ใช้แสดงอย่างเดียว ห้ามเอาผลไปคำนวณต่อ
// (เงิน/น้ำหนักจาก back-end เป็น string เช่น "878770.45")

const TZ = 'Asia/Bangkok';

// "878770" → "฿878,770"  · มีสตางค์ (เช่นราคา/กก. 155.5) → "฿155.50"
export function formatMoney(value) {
  const n = Number(value ?? 0);
  const digits = Number.isInteger(n) ? 0 : 2;
  return `฿${n.toLocaleString('th-TH', { minimumFractionDigits: digits, maximumFractionDigits: 2 })}`;
}

// "5780.29" → "5,780.29 กก."
export function formatWeight(value) {
  return `${Number(value ?? 0).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} กก.`;
}

// "2026-10-10T00:00:00.000Z" → "2026-10-10"  (ใช้กับ orderDate เท่านั้น)
export const toDateOnly = (value) => (value ? String(value).slice(0, 10) : '');

// "2026-10-10" หรือ "2026-10-10T00:00:00.000Z" → "10 ต.ค. 69"
export function formatDate(value) {
  const ymd = toDateOnly(value);
  if (!ymd) return '-';
  return new Date(`${ymd}T00:00:00Z`).toLocaleDateString('th-TH', {
    timeZone: 'UTC', // orderDate เก็บเป็นวันล้วน ห้ามเลื่อนตามเขตเวลา
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
}

// เวลาที่กดปุ่ม (UTC) → "2 พ.ย. 69 14:05"
export function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('th-TH', {
    timeZone: TZ,
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// วันนี้ตามเวลาไทย → "2026-11-02"
export function todayISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

// เลื่อนวัน: ("2026-11-02", -1) → "2026-11-01"
export function shiftDate(ymd, days) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// เดือนนี้ตามเวลาไทย → "2026-11"
export const thisMonthISO = () => todayISO().slice(0, 7)

// เลื่อนเดือน: ("2026-01", -1) → "2025-12"
export function shiftMonth(ym, months) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + months, 1))
  return d.toISOString().slice(0, 7)
}

// "2026-10" → "ตุลาคม 2569"
export function formatMonth(ym) {
  return new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('th-TH', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  })
}

// ผ่านมากี่วันแล้วนับจากวันที่นี้ (เทียบกับวันนี้ตามเวลาไทย)
export function daysSince(ymd) {
  const ms = new Date(`${todayISO()}T00:00:00Z`) - new Date(`${toDateOnly(ymd)}T00:00:00Z`)
  return Math.round(ms / 86_400_000)
}
