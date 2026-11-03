-- AlterTable
ALTER TABLE `orders` ADD COLUMN `cancelledAt` DATETIME(3) NULL,
    ADD COLUMN `isCancelled` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `orders_isCancelled_idx` ON `orders`(`isCancelled`);
