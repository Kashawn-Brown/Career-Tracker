-- CreateTable
CREATE TABLE "plan_usage_cycles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cycleYear" INTEGER NOT NULL,
    "cycleMonth" INTEGER NOT NULL,
    "baseCredits" INTEGER NOT NULL DEFAULT 0,
    "bonusCredits" INTEGER NOT NULL DEFAULT 0,
    "usedCredits" INTEGER NOT NULL DEFAULT 0,
    "planAtCycleStart" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_usage_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_usage_adjustments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cycleYear" INTEGER NOT NULL,
    "cycleMonth" INTEGER NOT NULL,
    "adjustmentType" TEXT NOT NULL,
    "creditsAdded" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "adminUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_usage_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "planAtRequest" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "userNote" TEXT,
    "adminNote" TEXT,
    "adminUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_usage_cycles_userId_cycleYear_cycleMonth_idx" ON "plan_usage_cycles"("userId", "cycleYear", "cycleMonth");

-- CreateIndex
CREATE UNIQUE INDEX "plan_usage_cycles_userId_cycleYear_cycleMonth_key" ON "plan_usage_cycles"("userId", "cycleYear", "cycleMonth");

-- CreateIndex
CREATE INDEX "plan_usage_adjustments_userId_cycleYear_cycleMonth_idx" ON "plan_usage_adjustments"("userId", "cycleYear", "cycleMonth");

-- CreateIndex
CREATE INDEX "plan_usage_adjustments_adminUserId_idx" ON "plan_usage_adjustments"("adminUserId");

-- CreateIndex
CREATE INDEX "plan_requests_userId_status_idx" ON "plan_requests"("userId", "status");

-- CreateIndex
CREATE INDEX "plan_requests_status_requestedAt_idx" ON "plan_requests"("status", "requestedAt" DESC);

-- AddForeignKey
ALTER TABLE "plan_usage_cycles" ADD CONSTRAINT "plan_usage_cycles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_usage_adjustments" ADD CONSTRAINT "plan_usage_adjustments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_requests" ADD CONSTRAINT "plan_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
