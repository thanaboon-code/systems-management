// Route = "ป้ายบอกทาง" จับคู่ METHOD + URL → ฟังก์ชันใน controller
import { Router } from 'express';
import * as newOrderController from '../controllers/newOrder.controllers.js';

const newOrderRouter = Router();

// ต้องอยู่ก่อน '/:id' ไม่งั้น "options" จะถูกมองเป็น id
newOrderRouter.get('/options', newOrderController.getOptions);  // ไซซ์/ปลายทาง/ชื่อบ่อ ที่เคยกรอก
newOrderRouter.get('/cancelled', newOrderController.getCancelledOrders); // รายการที่ยกเลิกของวันนั้น

// CRUD
newOrderRouter.get('/', newOrderController.getAllOrders);       // ดูรายการ (+ กรองวัน + แบ่งหน้า)
newOrderRouter.get('/:id', newOrderController.getOrderById);    // ดูรายการเดียว
newOrderRouter.post('/', newOrderController.createOrder);       // เพิ่ม
newOrderRouter.put('/:id', newOrderController.updateOrder);     // แก้ไข
newOrderRouter.delete('/:id', newOrderController.cancelOrder);  // ยกเลิก (ไม่ลบจริง)
newOrderRouter.patch('/:id/restore', newOrderController.restoreOrder); // กู้คืน

// 2 ปุ่มเช็ก
newOrderRouter.patch('/:id/paid-to-farmer', newOrderController.togglePaidToFarmer); // จ่ายเจ้าของบ่อแล้ว
newOrderRouter.patch('/:id/received', newOrderController.toggleReceived);           // ได้รับเงินแล้ว

export default newOrderRouter;
