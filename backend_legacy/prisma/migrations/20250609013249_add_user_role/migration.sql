-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'PREMIUM', 'ADMIN', 'MODERATOR');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';
