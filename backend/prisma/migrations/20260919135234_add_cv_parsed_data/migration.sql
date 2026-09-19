-- CreateTable
CREATE TABLE `CV` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `candidateProfileId` INTEGER NOT NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `filePath` VARCHAR(500) NOT NULL,
    `fileType` VARCHAR(10) NOT NULL,
    `rawText` LONGTEXT NULL,
    `status` ENUM('UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'UPLOADED',
    `errorMessage` TEXT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `parsedAt` DATETIME(3) NULL,

    INDEX `CV_candidateProfileId_idx`(`candidateProfileId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Skill` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `aliases` TEXT NOT NULL,

    UNIQUE INDEX `Skill_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CandidateSkill` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `candidateProfileId` INTEGER NOT NULL,
    `skillId` INTEGER NULL,
    `rawName` VARCHAR(255) NOT NULL,
    `evidence` TEXT NULL,
    `source` VARCHAR(20) NOT NULL,
    `isConfirmed` BOOLEAN NOT NULL DEFAULT false,

    INDEX `CandidateSkill_candidateProfileId_idx`(`candidateProfileId`),
    INDEX `CandidateSkill_skillId_idx`(`skillId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CandidateExperience` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `candidateProfileId` INTEGER NOT NULL,
    `position` VARCHAR(255) NOT NULL,
    `companyName` VARCHAR(255) NOT NULL,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `description` TEXT NULL,
    `evidence` TEXT NULL,
    `source` VARCHAR(20) NOT NULL,
    `isConfirmed` BOOLEAN NOT NULL DEFAULT false,

    INDEX `CandidateExperience_candidateProfileId_idx`(`candidateProfileId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CandidateEducation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `candidateProfileId` INTEGER NOT NULL,
    `school` VARCHAR(255) NOT NULL,
    `major` VARCHAR(255) NOT NULL,
    `degree` VARCHAR(255) NOT NULL,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `source` VARCHAR(20) NOT NULL,
    `isConfirmed` BOOLEAN NOT NULL DEFAULT false,

    INDEX `CandidateEducation_candidateProfileId_idx`(`candidateProfileId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CV` ADD CONSTRAINT `CV_candidateProfileId_fkey` FOREIGN KEY (`candidateProfileId`) REFERENCES `CandidateProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CandidateSkill` ADD CONSTRAINT `CandidateSkill_candidateProfileId_fkey` FOREIGN KEY (`candidateProfileId`) REFERENCES `CandidateProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CandidateSkill` ADD CONSTRAINT `CandidateSkill_skillId_fkey` FOREIGN KEY (`skillId`) REFERENCES `Skill`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CandidateExperience` ADD CONSTRAINT `CandidateExperience_candidateProfileId_fkey` FOREIGN KEY (`candidateProfileId`) REFERENCES `CandidateProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CandidateEducation` ADD CONSTRAINT `CandidateEducation_candidateProfileId_fkey` FOREIGN KEY (`candidateProfileId`) REFERENCES `CandidateProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
