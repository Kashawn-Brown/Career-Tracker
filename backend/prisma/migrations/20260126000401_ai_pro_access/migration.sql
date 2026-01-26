-- CreateEnum
CREATE TYPE "AiProRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "aiFreeUsesUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "aiProEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ai_pro_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "note" TEXT,
    "status" "AiProRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "cooldownUntil" TIMESTAMP(3),
    "decisionNote" TEXT,

    CONSTRAINT "ai_pro_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_pro_requests_userId_idx" ON "ai_pro_requests"("userId");

-- CreateIndex
CREATE INDEX "ai_pro_requests_status_idx" ON "ai_pro_requests"("status");

-- CreateIndex
CREATE INDEX "ai_pro_requests_userId_requestedAt_idx" ON "ai_pro_requests"("userId", "requestedAt");

-- AddForeignKey
ALTER TABLE "ai_pro_requests" ADD CONSTRAINT "ai_pro_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
