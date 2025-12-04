-- AlterTable: Add scheduled_date column as nullable first
ALTER TABLE "tasks" ADD COLUMN "scheduled_date" TIMESTAMP(3);

-- Update existing tasks: set scheduled_date to created_at (reasonable default for existing tasks)
UPDATE "tasks" SET "scheduled_date" = "created_at" WHERE "scheduled_date" IS NULL;

-- Make column NOT NULL
ALTER TABLE "tasks" ALTER COLUMN "scheduled_date" SET NOT NULL;

-- CreateIndex
CREATE INDEX "tasks_scheduled_date_idx" ON "tasks"("scheduled_date");


