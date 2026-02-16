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

export interface IBacktestRunRepository {
  saveRun(input: SaveBacktestRunInput): Promise<string>;
}

export const BACKTEST_RUN_REPOSITORY_TOKEN = Symbol('IBacktestRunRepository');
