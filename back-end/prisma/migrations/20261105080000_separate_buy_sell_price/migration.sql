-- แยกราคาซื้อ (จากเจ้าของบ่อ) กับราคาขาย (โรงงานรับซื้อ) + เก็บกำไร
-- ข้อมูลเดิม: ราคาเดิมคือราคาขาย → ตั้งราคาซื้อ = ราคาเดิมไปก่อน (แก้ทีหลังได้ใน order ที่ยังไม่ปิดเงิน)

-- AlterTable
ALTER TABLE `order_items` ADD COLUMN `buyAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `buyPricePerKg` DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `orders` ADD COLUMN `buyTotal` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `profit` DECIMAL(14, 2) NOT NULL DEFAULT 0;

-- ย้ายข้อมูลเดิม
UPDATE `order_items` SET `buyPricePerKg` = `pricePerKg`, `buyAmount` = `amount`;

UPDATE `orders` AS `o`
JOIN (
  SELECT `orderId`, SUM(`buyAmount`) AS `sumBuy`
  FROM `order_items`
  GROUP BY `orderId`
) AS `t` ON `t`.`orderId` = `o`.`id`
SET `o`.`buyTotal` = `t`.`sumBuy`;

-- ส่วนต่างคิดจากยอดซื้อ (เท่ากับยอดเดิม เพราะราคาซื้อ = ราคาขายเดิม)
UPDATE `orders`
SET `marginAmount` = IF(`includeMargin`, ROUND(`buyTotal` * `marginRate` / 100, 0), 0);

UPDATE `orders`
SET `grandTotal` = `buyTotal` - `marginAmount`,
    `profit` = `totalAmount` - (`buyTotal` - `marginAmount`);

-- ใช้ DEFAULT แค่ตอนย้ายข้อมูล → เอาออกให้ตรงกับ schema.prisma
ALTER TABLE `order_items` ALTER COLUMN `buyAmount` DROP DEFAULT,
    ALTER COLUMN `buyPricePerKg` DROP DEFAULT;
ALTER TABLE `orders` ALTER COLUMN `buyTotal` DROP DEFAULT,
    ALTER COLUMN `profit` DROP DEFAULT;
