export type CandleIngestionRunnerStatusView = {
  queuedJobs: number;
  runningJobs: number;
  maxConcurrentJobs: number;
  maxConcurrentSymbols: number;
  maxApiConcurrency: number;
  apiInFlight: number;
};

export interface ICandleIngestionRunner {
  enqueue(jobId: string): void;
  resumePendingJobs(limit?: number): Promise<number>;
  getStatus(): CandleIngestionRunnerStatusView;
}

export const CANDLE_INGESTION_RUNNER_TOKEN = Symbol('ICandleIngestionRunner');
