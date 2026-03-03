export interface ICandleIngestionRunner {
  enqueue(jobId: string): void;
}

export const CANDLE_INGESTION_RUNNER_TOKEN = Symbol('ICandleIngestionRunner');
