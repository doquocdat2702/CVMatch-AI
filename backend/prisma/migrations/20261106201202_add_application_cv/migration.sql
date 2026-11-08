-- AlterTable
ALTER TABLE `Application` ADD COLUMN `cvId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `Application_cvId_idx` ON `Application`(`cvId`);

-- AddForeignKey
ALTER TABLE `Application` ADD CONSTRAINT `Application_cvId_fkey` FOREIGN KEY (`cvId`) REFERENCES `CV`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

