-- CreateTable
CREATE TABLE "ai_artifacts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobApplicationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_artifacts_userId_idx" ON "ai_artifacts"("userId");

-- CreateIndex
CREATE INDEX "ai_artifacts_jobApplicationId_idx" ON "ai_artifacts"("jobApplicationId");

-- CreateIndex
CREATE INDEX "ai_artifacts_jobApplicationId_kind_idx" ON "ai_artifacts"("jobApplicationId", "kind");

-- AddForeignKey
ALTER TABLE "ai_artifacts" ADD CONSTRAINT "ai_artifacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_artifacts" ADD CONSTRAINT "ai_artifacts_jobApplicationId_fkey" FOREIGN KEY ("jobApplicationId") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
