-- AlterTable
ALTER TABLE "users" ADD COLUMN     "jobSearchKeywordsText" TEXT,
ADD COLUMN     "jobSearchLocationsText" TEXT,
ADD COLUMN     "jobSearchSummary" TEXT,
ADD COLUMN     "jobSearchTitlesText" TEXT,
ADD COLUMN     "jobSearchWorkMode" "WorkMode" NOT NULL DEFAULT 'UNKNOWN';
