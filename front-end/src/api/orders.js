// API ของ Order (ดูรายละเอียดใน back-end/API.md)
import { request, toQuery } from './client.js';

// รายการ: { data, page, pageSize, total, totalPages }
export const getOrders = ({ date, page, pageSize } = {}) =>
  request(`/new-order${toQuery({ date, page, pageSize })}`);

export const getOrder = (id) => request(`/new-order/${id}`);

// รายการที่ยกเลิกของวันนั้น (ไว้กู้คืน)
export const getCancelledOrders = (date) => request(`/new-order/cancelled${toQuery({ date })}`);

// ตัวเลือกที่เคยกรอก: { sizes, destinations, pondNames }
export const getOrderOptions = () => request('/new-order/options');

export const createOrder = (order) => request('/new-order', { method: 'POST', body: order });

export const updateOrder = (id, order) => request(`/new-order/${id}`, { method: 'PUT', body: order });

// ยกเลิก (ไม่ลบจริง) / กู้คืน
export const cancelOrder = (id) => request(`/new-order/${id}`, { method: 'DELETE' });
export const restoreOrder = (id) => request(`/new-order/${id}/restore`, { method: 'PATCH' });

// 2 ปุ่มเช็กเงิน
export const setPaidToFarmer = (id, checked) =>
  request(`/new-order/${id}/paid-to-farmer`, { method: 'PATCH', body: { checked } });

// รับเงินแยกตามปลายทาง: destination = "โรงงาน ก" | null (ไม่ระบุปลายทาง) | ไม่ส่ง (ทุกปลายทาง)
export const setReceived = (id, checked, destination) =>
  request(`/new-order/${id}/received`, {
    method: 'PATCH',
    body: destination === undefined ? { checked } : { checked, destination },
  });
