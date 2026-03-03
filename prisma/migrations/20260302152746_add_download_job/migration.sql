-- CreateTable
CREATE TABLE "candle_ingestion_jobs" (
    "id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "interval" TEXT NOT NULL DEFAULT '4h',
    "backfillCandles" INTEGER NOT NULL DEFAULT 1000,
    "symbolsTotal" INTEGER NOT NULL DEFAULT 0,
    "symbolsCompleted" INTEGER NOT NULL DEFAULT 0,
    "symbolsFailed" INTEGER NOT NULL DEFAULT 0,
    "symbolsSkipped" INTEGER NOT NULL DEFAULT 0,
    "configHash" TEXT NOT NULL,
    "freshnessTargetMs" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "candle_ingestion_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candle_ingestion_symbol_runs" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "fromOpenTime" BIGINT,
    "toOpenTime" BIGINT,
    "lastSyncedOpenTime" BIGINT,
    "processedCandles" INTEGER NOT NULL DEFAULT 0,
    "insertedCandles" INTEGER NOT NULL DEFAULT 0,
    "updatedCandles" INTEGER NOT NULL DEFAULT 0,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "candle_ingestion_symbol_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "candle_ingestion_jobs_status_updatedAt_idx" ON "candle_ingestion_jobs"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "candle_ingestion_jobs_configHash_createdAt_idx" ON "candle_ingestion_jobs"("configHash", "createdAt");

-- CreateIndex
CREATE INDEX "candle_ingestion_symbol_runs_jobId_status_idx" ON "candle_ingestion_symbol_runs"("jobId", "status");

-- CreateIndex
CREATE INDEX "candle_ingestion_symbol_runs_symbol_interval_status_idx" ON "candle_ingestion_symbol_runs"("symbol", "interval", "status");

-- CreateIndex
CREATE INDEX "candle_ingestion_symbol_runs_symbol_interval_lastSyncedOpen_idx" ON "candle_ingestion_symbol_runs"("symbol", "interval", "lastSyncedOpenTime");

-- CreateIndex
CREATE UNIQUE INDEX "candle_ingestion_symbol_runs_jobId_symbol_interval_key" ON "candle_ingestion_symbol_runs"("jobId", "symbol", "interval");

-- AddForeignKey
ALTER TABLE "candle_ingestion_symbol_runs" ADD CONSTRAINT "candle_ingestion_symbol_runs_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "candle_ingestion_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
