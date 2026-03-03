export type CandleIngestionMode = 'backfill' | 'incremental';

export type CandleIngestionJobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'completed_with_errors';

export type CreateCandleIngestionJobInput = {
  mode: CandleIngestionMode;
  interval: string;
  backfillCandles: number;
  configHash: string;
  freshnessTargetMs?: bigint;
};

export type CandleIngestionJobView = {
  id: string;
  mode: CandleIngestionMode;
  status: CandleIngestionJobStatus;
  errorMessage: string | null;
  interval: string;
  backfillCandles: number;
  symbolsTotal: number;
  symbolsCompleted: number;
  symbolsFailed: number;
  symbolsSkipped: number;
  configHash: string;
  freshnessTargetMs: string | null;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
};

export type CandleIngestionSymbolRunView = {
  id: string;
  jobId: string;
  symbol: string;
  interval: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  errorMessage: string | null;
  fromOpenTime: string | null;
  toOpenTime: string | null;
  lastSyncedOpenTime: string | null;
  processedCandles: number;
  insertedCandles: number;
  updatedCandles: number;
  retries: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
};

export interface ICandleIngestionJobRepository {
  createJob(input: CreateCandleIngestionJobInput): Promise<CandleIngestionJobView>;
  findById(jobId: string): Promise<CandleIngestionJobView | null>;
  markRunning(jobId: string): Promise<void>;
  markCompleted(
    jobId: string,
    status: 'completed' | 'completed_with_errors',
  ): Promise<void>;
  markFailed(jobId: string, errorMessage: string): Promise<void>;
  setSymbolsTotal(jobId: string, total: number): Promise<void>;
  incrementCompleted(jobId: string): Promise<void>;
  incrementFailed(jobId: string): Promise<void>;
  incrementSkipped(jobId: string): Promise<void>;
  upsertSymbolRun(
    jobId: string,
    symbol: string,
    interval: string,
    data: {
      status: 'running' | 'completed' | 'failed' | 'skipped';
      errorMessage?: string | null;
      fromOpenTime?: bigint | null;
      toOpenTime?: bigint | null;
      lastSyncedOpenTime?: bigint | null;
      processedCandles?: number;
      insertedCandles?: number;
      updatedCandles?: number;
      retries?: number;
      startedAt?: Date | null;
      completedAt?: Date | null;
    },
  ): Promise<void>;
  findSymbolRunsByJobId(jobId: string): Promise<CandleIngestionSymbolRunView[] | null>;
}

export const CANDLE_INGESTION_JOB_REPOSITORY_TOKEN = Symbol(
  'ICandleIngestionJobRepository',
);
