CREATE TABLE "in_play_entry_windows" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "rangeId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "zoneDirection" TEXT NOT NULL,
    "zoneLowerBound" TEXT NOT NULL,
    "zoneUpperBound" TEXT NOT NULL,
    "zoneStartTime" BIGINT NOT NULL,
    "mitigatedCandleOpenTime" BIGINT NOT NULL,
    "mitigatedCandleCloseTime" BIGINT NOT NULL,
    "outsideCandleCloseTime" BIGINT NOT NULL,
    "fromTime" BIGINT NOT NULL,
    "toTime" BIGINT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "in_play_entry_windows_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "in_play_entry_windows_runId_symbol_fromTime_idx"
ON "in_play_entry_windows"("runId", "symbol", "fromTime");

CREATE INDEX "in_play_entry_windows_symbol_interval_fromTime_toTime_idx"
ON "in_play_entry_windows"("symbol", "interval", "fromTime", "toTime");

ALTER TABLE "in_play_entry_windows"
ADD CONSTRAINT "in_play_entry_windows_runId_fkey"
FOREIGN KEY ("runId") REFERENCES "in_play_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
