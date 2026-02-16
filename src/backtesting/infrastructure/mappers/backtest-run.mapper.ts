import { Injectable } from '@nestjs/common';
import { BacktestRun, BacktestTrade, Prisma } from '@prisma/client';
import {
  BacktestRunListItemView,
  BacktestRunView,
  BacktestTradeView,
  SaveBacktestRunInput,
} from 'src/backtesting/domain/interfaces/backtest-run-repository.interface';

@Injectable()
export class BacktestRunMapper {
  public toPersistenceRun(input: SaveBacktestRunInput) {
    return {
      symbol: input.symbol,
      interval: input.interval,
      strategyVersion: input.strategyVersion,
      config: this.toPrismaJson(input.config),
      startTime: input.startTimeMs,
      endTime: input.endTimeMs,
      totalTrades: input.metrics.totalTrades,
      winningTrades: input.metrics.winningTrades,
      losingTrades: input.metrics.losingTrades,
      winRate: Number(input.metrics.winRate),
      totalPnL: input.metrics.totalPnL,
      maxDrawdown: input.metrics.maxDrawdown,
      sharpeRatio: Number(input.metrics.sharpeRatio),
      profitFactor: Number(input.metrics.profitFactor),
      avgWin: input.metrics.avgWin,
      avgLoss: input.metrics.avgLoss,
    };
  }

  public toPersistenceTrades(input: SaveBacktestRunInput) {
    return input.trades.map((trade) => ({
      entryTime: trade.getEntryTime().toMs(),
      exitTime: trade.getExitTime()?.toMs() ?? null,
      entryPrice: trade.getEntryPrice().toString(),
      exitPrice: trade.getExitPrice()?.toString() ?? null,
      quantity: trade.getQuantity().toString(),
      side: trade.getSide(),
      pnl: trade.getPnL()?.toString() ?? '0',
      pnlPercent: trade.getPnLPercent(),
      status: trade.getStatus(),
    }));
  }

  public toDomainRun(
    run: BacktestRun & { trades: BacktestTrade[] },
  ): BacktestRunView {
    return {
      id: run.id,
      symbol: run.symbol,
      interval: run.interval,
      strategyVersion: run.strategyVersion,
      config: run.config as Record<string, unknown>,
      startTime: run.startTime.toString(),
      endTime: run.endTime.toString(),
      totalTrades: run.totalTrades,
      winningTrades: run.winningTrades,
      losingTrades: run.losingTrades,
      winRate: run.winRate,
      totalPnL: run.totalPnL,
      maxDrawdown: run.maxDrawdown,
      sharpeRatio: run.sharpeRatio,
      profitFactor: run.profitFactor,
      avgWin: run.avgWin,
      avgLoss: run.avgLoss,
      createdAt: run.createdAt,
      trades: run.trades.map((trade) => this.toDomainTrade(trade)),
    };
  }

  public toDomainRunListItem(run: BacktestRun): BacktestRunListItemView {
    return {
      id: run.id,
      symbol: run.symbol,
      interval: run.interval,
      strategyVersion: run.strategyVersion,
      startTime: run.startTime.toString(),
      endTime: run.endTime.toString(),
      totalTrades: run.totalTrades,
      winRate: run.winRate,
      totalPnL: run.totalPnL,
      createdAt: run.createdAt,
    };
  }

  private toDomainTrade(trade: BacktestTrade): BacktestTradeView {
    return {
      id: trade.id,
      entryTime: trade.entryTime.toString(),
      exitTime: trade.exitTime?.toString() ?? null,
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice,
      quantity: trade.quantity,
      side: trade.side,
      pnl: trade.pnl,
      pnlPercent: trade.pnlPercent,
      status: trade.status,
      createdAt: trade.createdAt,
    };
  }

  private toPrismaJson(value: Record<string, unknown>): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
