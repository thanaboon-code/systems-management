// Controller = "คนรับเรื่อง" รับ req → เรียก service → ส่ง res กลับ
import createError from 'http-errors';
import * as newOrderService from '../services/newOrder.services.js';

function getId(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw createError(400, 'id ต้องเป็นตัวเลข');
  return id;
}

// ?page=2 → 2 (ต้องเป็นจำนวนเต็มบวก)
function parsePositiveInt(value, name) {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) throw createError(400, `${name} ต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป`);
  return n;
}

// body ของปุ่มเช็ก: { "checked": true }
function getChecked(req) {
  const { checked } = req.body ?? {};
  if (typeof checked !== 'boolean') throw createError(400, 'ต้องส่ง { "checked": true } หรือ { "checked": false }');
  return checked;
}

// GET /api/new-order?date=2026-10-10&page=1&pageSize=50
export async function getAllOrders(req, res) {
  const q = req.query;
  const result = await newOrderService.findAll({
    date: q.date,
    page: parsePositiveInt(q.page, 'page'),
    pageSize: parsePositiveInt(q.pageSize, 'pageSize'),
  });
  res.json(result);
}

// GET /api/new-order/options  → ไซซ์ / ปลายทาง / ชื่อบ่อ ที่เคยกรอก
export async function getOptions(req, res) {
  res.json(await newOrderService.getOptions());
}

// GET /api/new-order/:id
export async function getOrderById(req, res) {
  const order = await newOrderService.findById(getId(req));
  if (!order) throw createError(404, 'ไม่พบรายการนี้');
  res.json(order);
}

// POST /api/new-order
export async function createOrder(req, res) {
  const order = await newOrderService.create(req.body ?? {});
  res.status(201).json(order);
}

// PUT /api/new-order/:id
export async function updateOrder(req, res) {
  const order = await newOrderService.update(getId(req), req.body ?? {});
  res.json(order);
}

// DELETE /api/new-order/:id  → ยกเลิก (ไม่ลบจริง ข้อมูลยังอยู่)
export async function cancelOrder(req, res) {
  const order = await newOrderService.cancel(getId(req));
  res.json(order);
}

// PATCH /api/new-order/:id/restore  → กู้คืนรายการที่ยกเลิก
export async function restoreOrder(req, res) {
  const order = await newOrderService.restore(getId(req));
  res.json(order);
}

// PATCH /api/new-order/:id/paid-to-farmer   body: { "checked": true }
export async function togglePaidToFarmer(req, res) {
  const order = await newOrderService.setPaidToFarmer(getId(req), getChecked(req));
  res.json(order);
}

// PATCH /api/new-order/:id/received   body: { "checked": true }
export async function toggleReceived(req, res) {
  const order = await newOrderService.setReceived(getId(req), getChecked(req));
  res.json(order);
}
