// ตัวกลางเรียก API — ทุกไฟล์ใน src/api ใช้ฟังก์ชันนี้
// ถ้า back-end ตอบ error จะ throw ApiError ที่มี message ภาษาไทยจาก server

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status; // 400 ข้อมูลผิด, 404 ไม่พบ, 409 ทำไม่ได้ตามกฎ, 500 server พัง
  }
}

export async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('เชื่อมต่อ server ไม่ได้ ตรวจว่าเปิด back-end (pnpm dev) อยู่หรือไม่', 0);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(data?.message ?? `เกิดข้อผิดพลาด (${res.status})`, res.status);
  }
  return data;
}

// { date: '2026-10-10', page: undefined } → "?date=2026-10-10" (ตัดค่าว่างทิ้ง)
export function toQuery(params = {}) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return entries.length ? `?${new URLSearchParams(entries)}` : '';
}
