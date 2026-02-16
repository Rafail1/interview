import { Trade } from '../entities/trade.entity';

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

export interface IBacktestRunRepository {
  saveRun(input: SaveBacktestRunInput): Promise<string>;
  findById(runId: string): Promise<BacktestRunView | null>;
  listRuns(input: ListBacktestRunsInput): Promise<BacktestRunListView>;
}

export const BACKTEST_RUN_REPOSITORY_TOKEN = Symbol('IBacktestRunRepository');
