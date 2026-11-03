// API ของ Dashboard
import { request, toQuery } from './client.js';

// สรุปรายวัน (ไม่ส่ง date = วันนี้)
export const getDashboard = (date) => request(`/dashboard${toQuery({ date })}`);

// สรุปรายเดือน (month = "2026-10", ไม่ส่ง = เดือนนี้)
export const getMonthlySummary = (month) => request(`/dashboard/monthly${toQuery({ month })}`);

// ยอดค้างรับแยกตามโรงงาน/ปลายทาง
export const getReceivables = () => request('/dashboard/receivables');

// ยอดค้างจ่ายเจ้าของบ่อแยกตามบ่อ
export const getPayables = () => request('/dashboard/payables');
