import { Trade } from '../entities/trade.entity';
import { SignalType } from '../entities/signal.entity';

export type SaveBacktestRunInput = {
  symbol: string;
  interval: string;
  strategyVersion: string;
  config: Record<string, unknown>;
  startTimeMs: bigint;
  endTimeMs: bigint;
  metrics: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: string;
    totalPnL: string;
    maxDrawdown: string;
    sharpeRatio: string;
    profitFactor: string;
    avgWin: string;
    avgLoss: string;
  };
  trades: Trade[];
  signals?: Array<{
    timestampMs: bigint;
    signalType: SignalType;
    reason: string;
    price: string;
    metadata?: Record<string, unknown>;
  }>;
  equityPoints?: Array<{
    timestampMs: bigint;
    equity: string;
    drawdown: string;
  }>;
};

export type StartBacktestRunInput = {
  symbol: string;
  interval: string;
  strategyVersion: string;
  config: Record<string, unknown>;
  startTimeMs: bigint;
  endTimeMs: bigint;
};

export type BacktestSignalPersistenceInput = {
  timestampMs: bigint;
  signalType: SignalType;
  reason: string;
  price: string;
  metadata?: Record<string, unknown>;
};

export type BacktestEquityPointPersistenceInput = {
  timestampMs: bigint;
  equity: string;
  drawdown: string;
};

export type FinalizeBacktestRunInput = {
  runId: string;
  processedCandles: number;
  generatedSignals: number;
  metrics: SaveBacktestRunInput['metrics'];
  trades: Trade[];
};

export type BacktestTradeView = {
  id: string;
  entryTime: string;
  exitTime: string | null;
  entryPrice: string;
  exitPrice: string | null;
  quantity: string;
  side: string;
  pnl: string;
  pnlPercent: number;
  riskAmountAtEntry: string | null;
  equityImpactPercent: number | null;
  status: string;
  createdAt: Date;
};

export type BacktestRunView = {
  id: string;
  symbol: string;
  interval: string;
  strategyVersion: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  errorMessage: string | null;
  processedCandles: number;
  generatedSignals: number;
  cancelRequestedAt: Date | null;
  config: Record<string, unknown>;
  startTime: string;
  endTime: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnL: string;
  maxDrawdown: string;
  sharpeRatio: number;
  profitFactor: number;
  avgWin: string;
  avgLoss: string;
  signalsCount: number;
  equityPointsCount: number;
  createdAt: Date;
  updatedAt: Date;
  trades: BacktestTradeView[];
};

export type ListBacktestRunsInput = {
  sortBy: 'createdAt' | 'winRate' | 'totalPnL';
  sortOrder: 'asc' | 'desc';
  symbol?: string;
  interval?: string;
  fromDate?: Date;
  toDate?: Date;
  page: number;
  limit: number;
};

export type BacktestRunListItemView = {
  id: string;
  symbol: string;
  interval: string;
  strategyVersion: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  errorMessage: string | null;
  processedCandles: number;
  generatedSignals: number;
  cancelRequestedAt: Date | null;
  startTime: string;
  endTime: string;
  totalTrades: number;
  winRate: number;
  totalPnL: string;
  createdAt: Date;
  updatedAt: Date;
};

export type BacktestRunListView = {
  items: BacktestRunListItemView[];
  page: number;
  limit: number;
  total: number;
};

export type BacktestSignalEventView = {
  id: string;
  timestamp: string;
  signalType: SignalType;
  reason: string;
  price: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

export type BacktestEquityPointView = {
  id: string;
  timestamp: string;
  equity: string;
  drawdown: string;
  createdAt: Date;
};

export type GetBacktestRunSeriesInput = {
  runId: string;
  limit: number;
  fromTs?: bigint;
  toTs?: bigint;
  cursorTs?: bigint;
  cursorId?: string;
};

export type BacktestSignalEventListView = {
  items: BacktestSignalEventView[];
  limit: number;
  total: number;
  nextCursor: string | null;
};

export type BacktestEquityPointListView = {
  items: BacktestEquityPointView[];
  limit: number;
  total: number;
  nextCursor: string | null;
};

export type BacktestRunSummaryView = {
  id: string;
  symbol: string;
  interval: string;
  strategyVersion: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  errorMessage: string | null;
  processedCandles: number;
  generatedSignals: number;
  cancelRequestedAt: Date | null;
  startTime: string;
  endTime: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnL: string;
  maxDrawdown: string;
  sharpeRatio: number;
  profitFactor: number;
  signalsCount: number;
  equityPointsCount: number;
  lastEquity: string | null;
  lastDrawdown: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BacktestActiveRunView = {
  id: string;
  symbol: string;
  interval: string;
  strategyVersion: string;
  status: 'pending' | 'running';
  processedCandles: number;
  generatedSignals: number;
  startTime: string;
  endTime: string;
  createdAt: Date;
  updatedAt: Date;
  cancelRequestedAt: Date | null;
};

export interface IBacktestRunRepository {
  startRun(input: StartBacktestRunInput): Promise<string>;
  appendSignals(
    runId: string,
    signals: BacktestSignalPersistenceInput[],
  ): Promise<void>;
  appendEquityPoints(
    runId: string,
    points: BacktestEquityPointPersistenceInput[],
  ): Promise<void>;
  cancelRun(runId: string): Promise<boolean>;
  isRunCancelled(runId: string): Promise<boolean>;
  updateRunProgress(
    runId: string,
    processedCandles: number,
    generatedSignals: number,
  ): Promise<void>;
  finalizeRun(input: FinalizeBacktestRunInput): Promise<void>;
  failRun(runId: string, errorMessage: string): Promise<void>;
  saveRun(input: SaveBacktestRunInput): Promise<string>;
  findById(runId: string): Promise<BacktestRunView | null>;
  findSummaryById(runId: string): Promise<BacktestRunSummaryView | null>;
  listRuns(input: ListBacktestRunsInput): Promise<BacktestRunListView>;
  findSignalsByRunId(
    input: GetBacktestRunSeriesInput,
  ): Promise<BacktestSignalEventListView | null>;
  findEquityByRunId(
    input: GetBacktestRunSeriesInput,
  ): Promise<BacktestEquityPointListView | null>;
  listActiveRuns(): Promise<BacktestActiveRunView[]>;
}

export const BACKTEST_RUN_REPOSITORY_TOKEN = Symbol('IBacktestRunRepository');
