-- AlterTable
ALTER TABLE "in_play_runs"
ADD COLUMN "activationMode" TEXT NOT NULL DEFAULT 'both';

-- AlterTable
ALTER TABLE "in_play_ranges"
ADD COLUMN "activationReason" TEXT NOT NULL DEFAULT 'both';
