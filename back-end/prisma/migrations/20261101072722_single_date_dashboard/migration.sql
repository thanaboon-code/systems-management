/*
  Warnings:

  - You are about to drop the column `deliveryDate` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `destination` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `harvestDate` on the `orders` table. All the data in the column will be lost.
  - Added the required column `orderDate` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `orders_harvestDate_idx` ON `orders`;

-- AlterTable
ALTER TABLE `order_items` ADD COLUMN `destination` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `orders` DROP COLUMN `deliveryDate`,
    DROP COLUMN `destination`,
    DROP COLUMN `harvestDate`,
    ADD COLUMN `orderDate` DATE NOT NULL;

-- CreateIndex
CREATE INDEX `order_items_size_idx` ON `order_items`(`size`);

-- CreateIndex
CREATE INDEX `orders_orderDate_idx` ON `orders`(`orderDate`);

-- RenameIndex
ALTER TABLE `order_items` RENAME INDEX `order_items_orderId_fkey` TO `order_items_orderId_idx`;
