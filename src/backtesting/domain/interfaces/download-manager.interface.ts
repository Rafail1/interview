export type ImportJobStatus =
  | 'pending'
  | 'downloading'
  | 'completed'
  | 'failed';

export type ImportBinanceRequest = {
  symbol: string;
  interval: string;
  startDate: Date;
  endDate: Date;
  overwrite?: boolean;
};

export type ImportBinanceJobResult = {
  jobId: string;
  status: ImportJobStatus;
  filesQueued: number;
  downloadedCount: number;
  queuedPosition: number | null;
};

export type ImportJobProgress = {
  jobId: string;
  symbol: string;
  interval: string;
  status: ImportJobStatus;
  queuedPosition: number | null;
  queueSize: number;
  isQueued: boolean;
  activeImports: number;
  maxConcurrentImports: number;
  totalFiles: number;
  downloadedFiles: number;
  failedFiles: number;
  checksumValid: boolean;
  errorMessage: string | null;
  lastSuccessfulTime: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ImportQueueJobView = {
  jobId: string;
  symbol: string;
  interval: string;
  queuedPosition: number;
};

export type ImportQueueOverview = {
  queueSize: number;
  activeImports: number;
  maxConcurrentImports: number;
  queuedJobs: ImportQueueJobView[];
};

export interface IDownloadManager {
  startImport(request: ImportBinanceRequest): Promise<ImportBinanceJobResult>;
  getJobStatus(jobId: string): Promise<ImportJobProgress | null>;
  getQueueOverview(): ImportQueueOverview;
}

export const DOWNLOAD_MANAGER_TOKEN = Symbol('IDownloadManager');
