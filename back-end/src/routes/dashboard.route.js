import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controllers.js';

const dashboardRouter = Router();

dashboardRouter.get('/', dashboardController.getDailySummary);               // สรุปรายวัน
dashboardRouter.get('/monthly', dashboardController.getMonthlySummary);      // สรุปรายเดือน
dashboardRouter.get('/receivables', dashboardController.getReceivables);     // ค้างรับแยกโรงงาน
dashboardRouter.get('/payables', dashboardController.getPayables);           // ค้างจ่ายแยกบ่อ

export default dashboardRouter;
