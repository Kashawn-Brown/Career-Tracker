-- CreateTable
CREATE TABLE "user_ai_artifacts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "resumeSource" TEXT NOT NULL,
    "sourceDocumentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_ai_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_ai_artifacts_userId_idx" ON "user_ai_artifacts"("userId");

-- CreateIndex
CREATE INDEX "user_ai_artifacts_userId_kind_idx" ON "user_ai_artifacts"("userId", "kind");

-- CreateIndex
CREATE INDEX "user_ai_artifacts_userId_kind_createdAt_idx" ON "user_ai_artifacts"("userId", "kind", "createdAt");

-- AddForeignKey
ALTER TABLE "user_ai_artifacts" ADD CONSTRAINT "user_ai_artifacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
