-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('UNKNOWN', 'FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP');

-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('UNKNOWN', 'REMOTE', 'HYBRID', 'ONSITE');

-- AlterTable
ALTER TABLE "job_applications" ADD COLUMN     "isFavorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "jobType" "JobType" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "jobTypeDetails" TEXT,
ADD COLUMN     "salaryText" TEXT,
ADD COLUMN     "workMode" "WorkMode" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "workModeDetails" TEXT;
