// ประกอบร่าง Express app — ลำดับบรรทัดมีผล (request วิ่งจากบนลงล่าง)
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import newOrderRouter from './routes/newOrder.route.js';
import dashboardRouter from './routes/dashboard.route.js';
import { notFound, errorHandler } from './middlewares/error.middleware.js';

const app = express();

// 1) middleware ทั่วไป
app.use(helmet());        // security header
app.use(cors());          // ให้ front-end ต่างพอร์ตเรียกได้
app.use(morgan('dev'));   // log ทุก request ใน terminal
app.use(express.json());
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store'); // ห้าม browser เก็บผลเก่าไว้ใช้ ตัวเลขเงินต้องสดเสมอ
  next();
});  // แปลง body JSON → req.body (ไม่มีบรรทัดนี้ req.body จะว่าง)

// 2) routes
app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api/new-order', newOrderRouter);
app.use('/api/dashboard', dashboardRouter);

// 3) จัดการ error (ต้องอยู่ท้ายสุดเสมอ)
app.use(notFound);
app.use(errorHandler);

export default app;
