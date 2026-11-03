// จุดรับ error ตัวสุดท้าย — error เกิดที่ไหนก็มาจบที่นี่
// Express 5 ส่ง error จาก async function มาให้เอง ไม่ต้อง try/catch
import createError from 'http-errors';

// ไม่มี route ไหนตรงเลย → 404
export function notFound(req, res, next) {
  next(createError(404, `ไม่พบ ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err, req, res, next) {
  // แปล error ที่พบบ่อยของ Prisma ให้เป็นภาษาคน
  if (err.code === 'P2025') err = createError(404, 'ไม่พบข้อมูล');
  if (err.code === 'P2002') err = createError(409, 'ข้อมูลซ้ำกับที่มีอยู่แล้ว');
  if (err.code === 'P2000') err = createError(400, 'ข้อความยาวเกินกำหนด');
  if (err.code === 'P2020') err = createError(400, 'ตัวเลขมากเกินกำหนด');
  if (err.type === 'entity.too.large') err = createError(413, 'ข้อมูลที่ส่งมาใหญ่เกินไป');
  if (err.type === 'entity.parse.failed') err = createError(400, 'JSON ที่ส่งมาผิดรูปแบบ');
  if (err.name === 'PrismaClientValidationError') err = createError(400, 'ข้อมูลที่ส่งมาไม่ครบหรือผิดรูปแบบ');

  const status = err.status || 500;
  if (status >= 500) console.error(err); // error ที่ไม่คาดคิด พิมพ์ดูใน terminal

  res.status(status).json({
    message: status >= 500 ? 'เกิดข้อผิดพลาดในระบบ' : err.message,
  });
}
