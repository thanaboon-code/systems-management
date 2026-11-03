import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controllers.js';

const dashboardRouter = Router();

dashboardRouter.get('/', dashboardController.getDailySummary); // สรุปรายวัน

export default dashboardRouter;
