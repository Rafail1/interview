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
  status: string;
  createdAt: Date;
};

export type BacktestRunView = {
  id: string;
  symbol: string;
  interval: string;
  strategyVersion: string;
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
  startTime: string;
  endTime: string;
  totalTrades: number;
  winRate: number;
  totalPnL: string;
  createdAt: Date;
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
  page: number;
  limit: number;
  fromTs?: bigint;
  toTs?: bigint;
};

export type BacktestSignalEventListView = {
  items: BacktestSignalEventView[];
  page: number;
  limit: number;
  total: number;
};

export type BacktestEquityPointListView = {
  items: BacktestEquityPointView[];
  page: number;
  limit: number;
  total: number;
};

export type BacktestRunSummaryView = {
  id: string;
  symbol: string;
  interval: string;
  strategyVersion: string;
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
};

export interface IBacktestRunRepository {
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
}

export const BACKTEST_RUN_REPOSITORY_TOKEN = Symbol('IBacktestRunRepository');
