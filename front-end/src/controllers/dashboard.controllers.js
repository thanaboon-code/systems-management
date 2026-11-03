// Controller ของ Dashboard
import * as dashboardService from '../services/dashboard.services.js';

// GET /api/dashboard?date=2026-10-10  (ไม่ส่ง date = วันนี้)
export async function getDailySummary(req, res) {
  const summary = await dashboardService.getDailySummary(req.query.date);
  res.json(summary);
}
