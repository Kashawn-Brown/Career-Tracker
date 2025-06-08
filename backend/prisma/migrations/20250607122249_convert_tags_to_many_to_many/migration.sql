/*
  Warnings:

  - You are about to drop the column `jobApplicationId` on the `tags` table. All the data in the column will be lost.
  - You are about to drop the column `label` on the `tags` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `tags` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `tags` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Create temporary tables to preserve data during transformation
CREATE TEMP TABLE temp_tag_mappings AS
SELECT DISTINCT 
  label as tag_name,
  MIN(id) as kept_tag_id,
  array_agg(DISTINCT "jobApplicationId") as job_application_ids
FROM tags 
GROUP BY label;

-- Step 2: Create the new many-to-many join table
CREATE TABLE "_JobApplicationToTag" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_JobApplicationToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- Step 3: Add name column with temporary default to avoid constraint violation
ALTER TABLE "tags" ADD COLUMN "name" TEXT;

-- Step 4: Populate name column from label column
UPDATE "tags" SET "name" = "label";

-- Step 5: For each unique tag name, keep only one tag record and collect all job application associations
WITH tag_deduplication AS (
  SELECT 
    label,
    MIN(id) as kept_id,
    ARRAY_AGG(DISTINCT "jobApplicationId") as all_job_app_ids
  FROM tags
  GROUP BY label
)
-- Insert into join table for all associations
INSERT INTO "_JobApplicationToTag" ("A", "B")
SELECT 
  UNNEST(td.all_job_app_ids) as job_app_id,
  td.kept_id as tag_id
FROM tag_deduplication td;

-- Step 6: Delete duplicate tag records (keep only one per unique label)
DELETE FROM tags 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM tags 
  GROUP BY label
);

-- Step 7: Now make name column NOT NULL and add unique constraint
ALTER TABLE "tags" ALTER COLUMN "name" SET NOT NULL;

-- Step 8: Drop old columns and constraints
ALTER TABLE "tags" DROP CONSTRAINT "tags_jobApplicationId_fkey";
DROP INDEX "tags_jobApplicationId_idx";
ALTER TABLE "tags" DROP COLUMN "jobApplicationId";
ALTER TABLE "tags" DROP COLUMN "label";

-- Step 9: Add new indexes and constraints
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");
CREATE INDEX "tags_name_idx" ON "tags"("name");
CREATE INDEX "_JobApplicationToTag_B_index" ON "_JobApplicationToTag"("B");

-- Step 10: Add foreign key constraints to join table
ALTER TABLE "_JobApplicationToTag" ADD CONSTRAINT "_JobApplicationToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_JobApplicationToTag" ADD CONSTRAINT "_JobApplicationToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
