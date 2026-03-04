-- CreateTable
CREATE TABLE "in_play_runs" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "interval" TEXT NOT NULL DEFAULT '15m',
    "startTime" BIGINT NOT NULL,
    "endTime" BIGINT NOT NULL,
    "symbols" JSONB,
    "windowSize" INTEGER NOT NULL DEFAULT 24,
    "quoteVolumeThreshold" TEXT NOT NULL,
    "volatilityThreshold" TEXT NOT NULL,
    "totalSymbols" INTEGER NOT NULL DEFAULT 0,
    "processedSymbols" INTEGER NOT NULL DEFAULT 0,
    "rangesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "in_play_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "in_play_ranges" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "startTime" BIGINT NOT NULL,
    "endTime" BIGINT NOT NULL,
    "lowPrice" TEXT NOT NULL,
    "highPrice" TEXT NOT NULL,
    "activeWindows" INTEGER NOT NULL DEFAULT 0,
    "avgQuoteVolume" TEXT NOT NULL,
    "maxVolatilityPercent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "in_play_ranges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "in_play_runs_status_updatedAt_idx" ON "in_play_runs"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "in_play_ranges_runId_symbol_startTime_idx" ON "in_play_ranges"("runId", "symbol", "startTime");

-- CreateIndex
CREATE INDEX "in_play_ranges_symbol_interval_startTime_endTime_idx" ON "in_play_ranges"("symbol", "interval", "startTime", "endTime");

-- AddForeignKey
ALTER TABLE "in_play_ranges" ADD CONSTRAINT "in_play_ranges_runId_fkey" FOREIGN KEY ("runId") REFERENCES "in_play_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
