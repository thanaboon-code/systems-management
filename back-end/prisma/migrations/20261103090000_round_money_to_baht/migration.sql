-- ปัดยอดเงินของ order เดิมเป็นบาทเต็ม (สตางค์ ≥ 50 ปัดขึ้น, < 50 ปัดลง)
-- ไม่เปลี่ยนโครงตาราง เปลี่ยนเฉพาะข้อมูล

-- 1) ยอดแต่ละไซซ์ = น้ำหนัก × ราคา ปัดเป็นบาท
UPDATE `order_items`
SET `amount` = ROUND(`weight` * `pricePerKg`, 0);

-- 2) ยอดรวมของ order = ผลรวมยอดไซซ์
UPDATE `orders` AS `o`
JOIN (
  SELECT `orderId`, SUM(`amount`) AS `sumAmount`
  FROM `order_items`
  GROUP BY `orderId`
) AS `t` ON `t`.`orderId` = `o`.`id`
SET `o`.`totalAmount` = `t`.`sumAmount`;

-- 3) ส่วนต่าง (ปัดเป็นบาท) และยอดจ่ายเจ้าของบ่อ
UPDATE `orders`
SET `marginAmount` = IF(`includeMargin`, ROUND(`totalAmount` * `marginRate` / 100, 0), 0);

UPDATE `orders`
SET `grandTotal` = `totalAmount` - `marginAmount`;
