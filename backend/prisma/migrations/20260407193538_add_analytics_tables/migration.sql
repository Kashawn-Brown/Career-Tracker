-- CreateTable
CREATE TABLE "product_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "applicationId" TEXT,
    "eventType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "surface" TEXT,
    "planAtTime" TEXT,
    "roleAtTime" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_runs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT,
    "userArtifactId" TEXT,
    "applicationArtifactId" TEXT,
    "toolKind" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "triggerSource" TEXT NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "status" TEXT NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "errorCategory" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "inputChars" INTEGER,
    "outputChars" INTEGER,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "estimatedCostUsd" TEXT,
    "resumeMode" TEXT,
    "jdMode" TEXT,
    "planAtTime" TEXT,
    "roleAtTime" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artifact_interactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT,
    "userArtifactId" TEXT,
    "applicationArtifactId" TEXT,
    "interactionType" TEXT NOT NULL,
    "artifactKind" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artifact_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_events_userId_createdAt_idx" ON "product_events"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "product_events_eventType_createdAt_idx" ON "product_events"("eventType", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "product_events_category_createdAt_idx" ON "product_events"("category", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "product_events_applicationId_createdAt_idx" ON "product_events"("applicationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ai_runs_userId_createdAt_idx" ON "ai_runs"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ai_runs_toolKind_createdAt_idx" ON "ai_runs"("toolKind", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ai_runs_scope_createdAt_idx" ON "ai_runs"("scope", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ai_runs_status_createdAt_idx" ON "ai_runs"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ai_runs_planAtTime_createdAt_idx" ON "ai_runs"("planAtTime", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ai_runs_applicationId_createdAt_idx" ON "ai_runs"("applicationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ai_runs_provider_model_createdAt_idx" ON "ai_runs"("provider", "model", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "artifact_interactions_userId_createdAt_idx" ON "artifact_interactions"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "artifact_interactions_interactionType_createdAt_idx" ON "artifact_interactions"("interactionType", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "artifact_interactions_artifactKind_createdAt_idx" ON "artifact_interactions"("artifactKind", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "artifact_interactions_applicationId_createdAt_idx" ON "artifact_interactions"("applicationId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "product_events" ADD CONSTRAINT "product_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_events" ADD CONSTRAINT "product_events_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "job_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "job_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifact_interactions" ADD CONSTRAINT "artifact_interactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifact_interactions" ADD CONSTRAINT "artifact_interactions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "job_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
