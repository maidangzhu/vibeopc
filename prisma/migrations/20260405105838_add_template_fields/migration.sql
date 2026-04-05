-- AlterTable
ALTER TABLE "Command" ADD COLUMN     "templateType" TEXT NOT NULL DEFAULT 'free';

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "templateId" TEXT NOT NULL DEFAULT 'personal';
