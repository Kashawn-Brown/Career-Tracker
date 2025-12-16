-- AlterTable
ALTER TABLE "users" ADD COLUMN     "secondaryEmail" TEXT,
ADD COLUMN     "secondaryEmailVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "secondary_email_verification_tokens" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "secondary_email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "secondary_email_verification_tokens_token_key" ON "secondary_email_verification_tokens"("token");

-- CreateIndex
CREATE INDEX "secondary_email_verification_tokens_userId_idx" ON "secondary_email_verification_tokens"("userId");

-- CreateIndex
CREATE INDEX "secondary_email_verification_tokens_token_idx" ON "secondary_email_verification_tokens"("token");

-- CreateIndex
CREATE INDEX "secondary_email_verification_tokens_expiresAt_idx" ON "secondary_email_verification_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "users_secondaryEmail_idx" ON "users"("secondaryEmail");

-- AddForeignKey
ALTER TABLE "secondary_email_verification_tokens" ADD CONSTRAINT "secondary_email_verification_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
