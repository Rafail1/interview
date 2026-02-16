import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SaveBacktestRunInput } from 'src/backtesting/domain/interfaces/backtest-run-repository.interface';

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

  private toPrismaJson(value: Record<string, unknown>): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
