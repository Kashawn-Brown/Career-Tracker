-- AlterEnum
ALTER TYPE "AiProRequestStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;
