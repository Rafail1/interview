-- CreateTable
CREATE TABLE "market_data" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "openTime" BIGINT NOT NULL,
    "closeTime" BIGINT NOT NULL,
    "open" TEXT NOT NULL,
    "high" TEXT NOT NULL,
    "low" TEXT NOT NULL,
    "close" TEXT NOT NULL,
    "volume" TEXT NOT NULL,
    "quoteAssetVolume" TEXT NOT NULL,
    "numberOfTrades" INTEGER NOT NULL,
    "takerBuyBaseVolume" TEXT NOT NULL,
    "takerBuyQuoteVolume" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "download_jobs" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalFiles" INTEGER NOT NULL DEFAULT 0,
    "downloadedFiles" INTEGER NOT NULL DEFAULT 0,
    "failedFiles" INTEGER NOT NULL DEFAULT 0,
    "checksumValid" BOOLEAN NOT NULL DEFAULT false,
    "lastSuccessfulTime" BIGINT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "download_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backtest_runs" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "strategyVersion" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "startTime" BIGINT NOT NULL,
    "endTime" BIGINT NOT NULL,
    "totalTrades" INTEGER NOT NULL DEFAULT 0,
    "winningTrades" INTEGER NOT NULL DEFAULT 0,
    "losingTrades" INTEGER NOT NULL DEFAULT 0,
    "winRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPnL" TEXT NOT NULL,
    "maxDrawdown" TEXT NOT NULL,
    "sharpeRatio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profitFactor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgWin" TEXT NOT NULL,
    "avgLoss" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backtest_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backtest_trades" (
    "id" TEXT NOT NULL,
    "backtestRunId" TEXT NOT NULL,
    "entryTime" BIGINT NOT NULL,
    "exitTime" BIGINT,
    "entryPrice" TEXT NOT NULL,
    "exitPrice" TEXT,
    "quantity" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "pnl" TEXT NOT NULL,
    "pnlPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backtest_trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signal_events" (
    "id" TEXT NOT NULL,
    "backtestRunId" TEXT NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "signalType" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signal_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equity_points" (
    "id" TEXT NOT NULL,
    "backtestRunId" TEXT NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "equity" TEXT NOT NULL,
    "drawdown" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equity_points_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "market_data_symbol_interval_openTime_idx" ON "market_data"("symbol", "interval", "openTime");

-- CreateIndex
CREATE INDEX "market_data_symbol_interval_createdAt_idx" ON "market_data"("symbol", "interval", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "market_data_symbol_interval_openTime_key" ON "market_data"("symbol", "interval", "openTime");

-- CreateIndex
CREATE INDEX "download_jobs_symbol_interval_status_idx" ON "download_jobs"("symbol", "interval", "status");

-- CreateIndex
CREATE INDEX "backtest_runs_symbol_strategyVersion_createdAt_idx" ON "backtest_runs"("symbol", "strategyVersion", "createdAt");

-- CreateIndex
CREATE INDEX "backtest_trades_backtestRunId_status_idx" ON "backtest_trades"("backtestRunId", "status");

-- CreateIndex
CREATE INDEX "signal_events_backtestRunId_timestamp_idx" ON "signal_events"("backtestRunId", "timestamp");

-- CreateIndex
CREATE INDEX "equity_points_backtestRunId_timestamp_idx" ON "equity_points"("backtestRunId", "timestamp");

-- AddForeignKey
ALTER TABLE "backtest_trades" ADD CONSTRAINT "backtest_trades_backtestRunId_fkey" FOREIGN KEY ("backtestRunId") REFERENCES "backtest_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signal_events" ADD CONSTRAINT "signal_events_backtestRunId_fkey" FOREIGN KEY ("backtestRunId") REFERENCES "backtest_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equity_points" ADD CONSTRAINT "equity_points_backtestRunId_fkey" FOREIGN KEY ("backtestRunId") REFERENCES "backtest_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
