/*
  Warnings:

  - You are about to drop the `ai_pro_requests` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ai_pro_requests" DROP CONSTRAINT "ai_pro_requests_userId_fkey";

-- DropTable
DROP TABLE "ai_pro_requests";

-- DropEnum
DROP TYPE "AiProRequestStatus";
