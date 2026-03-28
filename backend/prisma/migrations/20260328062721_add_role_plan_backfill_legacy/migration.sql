-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserPlan" AS ENUM ('REGULAR', 'PRO', 'PRO_PLUS');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "plan" "UserPlan" NOT NULL DEFAULT 'REGULAR',
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_plan_idx" ON "users"("plan");
