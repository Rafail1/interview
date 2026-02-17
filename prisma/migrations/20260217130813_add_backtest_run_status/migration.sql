-- AlterTable
ALTER TABLE "backtest_runs" ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending';
