/*
  Warnings:

  - You are about to drop the `password_history` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "password_history" DROP CONSTRAINT "password_history_userId_fkey";

-- DropTable
DROP TABLE "password_history";
