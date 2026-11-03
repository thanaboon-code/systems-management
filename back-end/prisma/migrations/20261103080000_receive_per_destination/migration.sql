-- AlterTable
ALTER TABLE `order_items` ADD COLUMN `isReceived` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `receivedAt` DATETIME(3) NULL;

-- ย้ายข้อมูลเดิม: order ที่เคยติ๊ก "ได้รับเงินแล้ว" → ทุกไซซ์ของ order นั้นถือว่ารับแล้ว
UPDATE `order_items` AS `i`
JOIN `orders` AS `o` ON `o`.`id` = `i`.`orderId`
SET `i`.`isReceived` = true, `i`.`receivedAt` = `o`.`receivedAt`
WHERE `o`.`isReceived` = true;
