// Controller ของ Dashboard
import * as dashboardService from '../services/dashboard.services.js';

// GET /api/dashboard?date=2026-10-10  (ไม่ส่ง date = วันนี้)
export async function getDailySummary(req, res) {
  res.json(await dashboardService.getDailySummary(req.query.date));
}

// GET /api/dashboard/monthly?month=2026-10  (ไม่ส่ง month = เดือนนี้)
export async function getMonthlySummary(req, res) {
  res.json(await dashboardService.getMonthlySummary(req.query.month));
}

// GET /api/dashboard/receivables  → ยอดค้างรับแยกตามโรงงาน/ปลายทาง
export async function getReceivables(req, res) {
  res.json(await dashboardService.getReceivables());
}

// GET /api/dashboard/payables  → ยอดค้างจ่ายแยกตามบ่อ
export async function getPayables(req, res) {
  res.json(await dashboardService.getPayables());
}
