-- CreateTable
CREATE TABLE "user_security" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockoutCount" INTEGER NOT NULL DEFAULT 0,
    "lockoutUntil" TIMESTAMP(3),
    "lastLockoutReason" TEXT,
    "forcePasswordReset" BOOLEAN NOT NULL DEFAULT false,
    "forcePasswordResetReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_security_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_security_userId_key" ON "user_security"("userId");

-- CreateIndex
CREATE INDEX "user_security_userId_idx" ON "user_security"("userId");

-- CreateIndex
CREATE INDEX "user_security_isLocked_idx" ON "user_security"("isLocked");

-- CreateIndex
CREATE INDEX "user_security_lockoutUntil_idx" ON "user_security"("lockoutUntil");

-- AddForeignKey
ALTER TABLE "user_security" ADD CONSTRAINT "user_security_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
