export type InPlayRunStatus = 'pending' | 'running' | 'completed' | 'failed';

export type CreateInPlayRunInput = {
  interval: string;
  startTime: bigint;
  endTime: bigint;
  symbols?: string[] | null;
  activationMode: 'both' | 'either';
  windowSize: number;
  quoteVolumeThreshold: string;
  volatilityThreshold: string;
};

export type InPlayRunView = {
  id: string;
  status: InPlayRunStatus;
  errorMessage: string | null;
  interval: string;
  startTime: string;
  endTime: string;
  symbols: string[] | null;
  activationMode: 'both' | 'either';
  windowSize: number;
  quoteVolumeThreshold: string;
  volatilityThreshold: string;
  totalSymbols: number;
  processedSymbols: number;
  rangesCount: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
};

export type SaveInPlayRangeInput = {
  symbol: string;
  interval: string;
  startTime: bigint;
  endTime: bigint;
  lowPrice: string;
  highPrice: string;
  activeWindows: number;
  avgQuoteVolume: string;
  maxVolatilityPercent: string;
  activationReason: 'both' | 'volume_only' | 'volatility_only';
};

export type InPlayRangeView = {
  id: string;
  runId: string;
  symbol: string;
  interval: string;
  startTime: string;
  endTime: string;
  lowPrice: string;
  highPrice: string;
  activeWindows: number;
  avgQuoteVolume: string;
  maxVolatilityPercent: string;
  activationReason: 'both' | 'volume_only' | 'volatility_only';
  createdAt: Date;
};

export type SaveInPlayEntryWindowInput = {
  rangeId: string;
  symbol: string;
  interval: string;
  zoneId: string;
  zoneDirection: 'bullish' | 'bearish';
  zoneLowerBound: string;
  zoneUpperBound: string;
  zoneStartTime: bigint;
  mitigatedCandleOpenTime: bigint;
  mitigatedCandleCloseTime: bigint;
  outsideCandleCloseTime: bigint;
  fromTime: bigint;
  toTime: bigint;
  description: string;
};

export type InPlayEntryWindowView = {
  id: string;
  runId: string;
  rangeId: string;
  symbol: string;
  interval: string;
  zoneId: string;
  zoneDirection: 'bullish' | 'bearish';
  zoneLowerBound: string;
  zoneUpperBound: string;
  zoneStartTime: string;
  mitigatedCandleOpenTime: string;
  mitigatedCandleCloseTime: string;
  outsideCandleCloseTime: string;
  fromTime: string;
  toTime: string;
  description: string;
  createdAt: Date;
};

export interface IInPlayRunRepository {
  createRun(input: CreateInPlayRunInput): Promise<InPlayRunView>;
  findRunById(runId: string): Promise<InPlayRunView | null>;
  listResumableRuns(limit: number): Promise<string[]>;
  markRunning(runId: string): Promise<void>;
  markCompleted(runId: string): Promise<void>;
  markFailed(runId: string, message: string): Promise<void>;
  setTotalSymbols(runId: string, total: number): Promise<void>;
  incrementProcessedSymbols(runId: string): Promise<void>;
  addRanges(runId: string, ranges: SaveInPlayRangeInput[]): Promise<void>;
  listRanges(runId: string, symbol?: string): Promise<InPlayRangeView[] | null>;
  replaceEntryWindows(
    runId: string,
    windows: SaveInPlayEntryWindowInput[],
    symbol?: string,
  ): Promise<void>;
  listEntryWindows(
    runId: string,
    symbol?: string,
  ): Promise<InPlayEntryWindowView[] | null>;
  listRuns(input: {
    status?: InPlayRunStatus;
    page: number;
    limit: number;
  }): Promise<{
    items: InPlayRunView[];
    page: number;
    limit: number;
    total: number;
  }>;
}

export const IN_PLAY_RUN_REPOSITORY_TOKEN = Symbol('IInPlayRunRepository');
