-- CreateTable
CREATE TABLE `farmers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `buyers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('FACTORY', 'BANGKOK', 'OTHER') NOT NULL DEFAULT 'FACTORY',
    `phone` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `buyers_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shrimp_sizes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `shrimp_sizes_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `harvests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `farmerId` INTEGER NOT NULL,
    `buyerId` INTEGER NULL,
    `auctionDate` DATE NULL,
    `harvestDate` DATE NOT NULL,
    `deliveryDate` DATE NULL,
    `buyWeight` DECIMAL(10, 2) NOT NULL,
    `buyPrice` DECIMAL(10, 2) NULL,
    `buyTotal` DECIMAL(12, 2) NULL,
    `sellWeight` DECIMAL(10, 2) NULL,
    `sellTotal` DECIMAL(12, 2) NULL,
    `weightDiff` DECIMAL(10, 2) NULL,
    `profit` DECIMAL(12, 2) NULL,
    `status` ENUM('PLANNED', 'HARVESTED', 'DELIVERED', 'GRADED', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'PLANNED',
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `harvests_code_key`(`code`),
    INDEX `harvests_harvestDate_idx`(`harvestDate`),
    INDEX `harvests_farmerId_idx`(`farmerId`),
    INDEX `harvests_buyerId_idx`(`buyerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `harvest_sizes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `harvestId` INTEGER NOT NULL,
    `shrimpSizeId` INTEGER NOT NULL,
    `weight` DECIMAL(10, 2) NOT NULL,
    `pricePerKg` DECIMAL(10, 2) NOT NULL,
    `total` DECIMAL(12, 2) NOT NULL,

    UNIQUE INDEX `harvest_sizes_harvestId_shrimpSizeId_key`(`harvestId`, `shrimpSizeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `harvests` ADD CONSTRAINT `harvests_farmerId_fkey` FOREIGN KEY (`farmerId`) REFERENCES `farmers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `harvests` ADD CONSTRAINT `harvests_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `buyers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `harvest_sizes` ADD CONSTRAINT `harvest_sizes_harvestId_fkey` FOREIGN KEY (`harvestId`) REFERENCES `harvests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `harvest_sizes` ADD CONSTRAINT `harvest_sizes_shrimpSizeId_fkey` FOREIGN KEY (`shrimpSizeId`) REFERENCES `shrimp_sizes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
