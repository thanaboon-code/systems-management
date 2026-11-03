/*
  Warnings:

  - You are about to drop the `buyers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `farmers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `harvest_sizes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `harvests` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `shrimp_sizes` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `harvest_sizes` DROP FOREIGN KEY `harvest_sizes_harvestId_fkey`;

-- DropForeignKey
ALTER TABLE `harvest_sizes` DROP FOREIGN KEY `harvest_sizes_shrimpSizeId_fkey`;

-- DropForeignKey
ALTER TABLE `harvests` DROP FOREIGN KEY `harvests_buyerId_fkey`;

-- DropForeignKey
ALTER TABLE `harvests` DROP FOREIGN KEY `harvests_farmerId_fkey`;

-- DropTable
DROP TABLE `buyers`;

-- DropTable
DROP TABLE `farmers`;

-- DropTable
DROP TABLE `harvest_sizes`;

-- DropTable
DROP TABLE `harvests`;

-- DropTable
DROP TABLE `shrimp_sizes`;

-- CreateTable
CREATE TABLE `orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `harvestDate` DATE NOT NULL,
    `deliveryDate` DATE NULL,
    `pondName` VARCHAR(191) NOT NULL,
    `destination` VARCHAR(191) NULL,
    `note` VARCHAR(191) NULL,
    `totalWeight` DECIMAL(12, 2) NOT NULL,
    `totalAmount` DECIMAL(14, 2) NOT NULL,
    `includeMargin` BOOLEAN NOT NULL DEFAULT false,
    `marginRate` DECIMAL(5, 2) NOT NULL DEFAULT 1.5,
    `marginAmount` DECIMAL(14, 2) NOT NULL,
    `grandTotal` DECIMAL(14, 2) NOT NULL,
    `isPaidToFarmer` BOOLEAN NOT NULL DEFAULT false,
    `paidToFarmerAt` DATETIME(3) NULL,
    `isReceived` BOOLEAN NOT NULL DEFAULT false,
    `receivedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `orders_harvestDate_idx`(`harvestDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `size` VARCHAR(191) NOT NULL,
    `weight` DECIMAL(12, 2) NOT NULL,
    `pricePerKg` DECIMAL(10, 2) NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
