/*
  Warnings:

  - You are about to drop the column `fileName` on the `documents` table. All the data in the column will be lost.
  - Added the required column `filename` to the `documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mimeType` to the `documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originalName` to the `documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `path` to the `documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `documents` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "documents" DROP COLUMN "fileName",
ADD COLUMN     "filename" TEXT NOT NULL,
ADD COLUMN     "mimeType" TEXT NOT NULL,
ADD COLUMN     "originalName" TEXT NOT NULL,
ADD COLUMN     "path" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "documents_mimeType_idx" ON "documents"("mimeType");

-- CreateIndex
CREATE INDEX "documents_uploadDate_idx" ON "documents"("uploadDate");
