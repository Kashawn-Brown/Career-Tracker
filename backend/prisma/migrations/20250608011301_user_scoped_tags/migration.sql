/*
  Warnings:

  - A unique constraint covering the columns `[userId,name]` on the table `tags` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `tags` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "tags_name_key";

-- Step 1: Add userId column as nullable first
ALTER TABLE "tags" ADD COLUMN "userId" INTEGER;

-- Step 2: Update existing tags to belong to user 1 (assuming user 1 exists)
-- This assigns all existing tags to the first user in the system
UPDATE "tags" SET "userId" = 1 WHERE "userId" IS NULL;

-- Step 3: Make userId NOT NULL now that all rows have values
ALTER TABLE "tags" ALTER COLUMN "userId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "tags_userId_idx" ON "tags"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_userId_name_key" ON "tags"("userId", "name");

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
