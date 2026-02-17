/*
  Warnings:

  - Added the required column `updatedAt` to the `backtest_runs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "backtest_runs" ADD COLUMN     "cancelRequestedAt" TIMESTAMP(3),
ADD COLUMN     "generatedSignals" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "processedCandles" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "backtest_runs_status_updatedAt_idx" ON "backtest_runs"("status", "updatedAt");
