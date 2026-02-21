import { Injectable } from '@nestjs/common';
import {
  BacktestRun,
  BacktestTrade,
  EquityPoint,
  Prisma,
  SignalEvent,
} from '@prisma/client';
import {
  BacktestEquityPointPersistenceInput,
  BacktestEquityPointView,
  BacktestRunListItemView,
  BacktestRunSummaryView,
  BacktestSignalPersistenceInput,
  BacktestSignalEventView,
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
    return this.toPersistenceTradesBatch(input.trades);
  }

  public toPersistenceSignals(input: SaveBacktestRunInput) {
    return this.toPersistenceSignalsBatch(input.signals ?? []);
  }

  public toPersistenceEquityPoints(input: SaveBacktestRunInput) {
    return this.toPersistenceEquityPointsBatch(input.equityPoints ?? []);
  }

  public toPersistenceSignalsBatch(signals: BacktestSignalPersistenceInput[]) {
    return signals.map((signal) => ({
      timestamp: signal.timestampMs,
      signalType: signal.signalType,
      reason: signal.reason,
      price: signal.price,
      ...(signal.metadata
        ? { metadata: this.toPrismaJson(signal.metadata) }
        : {}),
    }));
  }

  public toPersistenceEquityPointsBatch(
    points: BacktestEquityPointPersistenceInput[],
  ) {
    return points.map((point) => ({
      timestamp: point.timestampMs,
      equity: point.equity,
      drawdown: point.drawdown,
    }));
  }

  public toPersistenceTradesBatch(trades: SaveBacktestRunInput['trades']) {
    return trades.map((trade) => ({
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
    run: BacktestRun & {
      trades: BacktestTrade[];
      _count: { signals: number; equityPoints: number };
    },
  ): BacktestRunView {
    const config = run.config as Record<string, unknown>;
    const initialBalance = this.toFiniteNumber(config.initialBalance);
    const riskPercent = this.toFiniteNumber(config.riskPercent);

    return {
      id: run.id,
      symbol: run.symbol,
      interval: run.interval,
      strategyVersion: run.strategyVersion,
      status: run.status as BacktestRunView['status'],
      errorMessage: run.errorMessage,
      processedCandles: run.processedCandles,
      generatedSignals: run.generatedSignals,
      cancelRequestedAt: run.cancelRequestedAt,
      config,
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
      signalsCount: run._count.signals,
      equityPointsCount: run._count.equityPoints,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
      trades: this.toDomainTrades(run.trades, initialBalance, riskPercent),
    };
  }

  public toDomainRunListItem(run: BacktestRun): BacktestRunListItemView {
    return {
      id: run.id,
      symbol: run.symbol,
      interval: run.interval,
      strategyVersion: run.strategyVersion,
      status: run.status as BacktestRunListItemView['status'],
      errorMessage: run.errorMessage,
      processedCandles: run.processedCandles,
      generatedSignals: run.generatedSignals,
      cancelRequestedAt: run.cancelRequestedAt,
      startTime: run.startTime.toString(),
      endTime: run.endTime.toString(),
      totalTrades: run.totalTrades,
      winRate: run.winRate,
      totalPnL: run.totalPnL,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
    };
  }

  public toDomainRunSummary(
    run: BacktestRun & {
      _count: { signals: number; equityPoints: number };
      equityPoints: EquityPoint[];
    },
  ): BacktestRunSummaryView {
    const lastPoint = run.equityPoints[0] ?? null;

    return {
      id: run.id,
      symbol: run.symbol,
      interval: run.interval,
      strategyVersion: run.strategyVersion,
      status: run.status as BacktestRunSummaryView['status'],
      errorMessage: run.errorMessage,
      processedCandles: run.processedCandles,
      generatedSignals: run.generatedSignals,
      cancelRequestedAt: run.cancelRequestedAt,
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
      signalsCount: run._count.signals,
      equityPointsCount: run._count.equityPoints,
      lastEquity: lastPoint?.equity ?? null,
      lastDrawdown: lastPoint?.drawdown ?? null,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
    };
  }

  public toDomainSignalEvent(signal: SignalEvent): BacktestSignalEventView {
    return {
      id: signal.id,
      timestamp: signal.timestamp.toString(),
      signalType: signal.signalType as BacktestSignalEventView['signalType'],
      reason: signal.reason,
      price: signal.price,
      metadata: (signal.metadata as Record<string, unknown> | null) ?? null,
      createdAt: signal.createdAt,
    };
  }

  public toDomainEquityPoint(point: EquityPoint): BacktestEquityPointView {
    return {
      id: point.id,
      timestamp: point.timestamp.toString(),
      equity: point.equity,
      drawdown: point.drawdown,
      createdAt: point.createdAt,
    };
  }

  private toDomainTrades(
    trades: BacktestTrade[],
    initialBalance: number | null,
    riskPercent: number | null,
  ): BacktestTradeView[] {
    let runningBalance = initialBalance;

    return trades.map((trade) => {
      const tradeView = this.toDomainTrade(trade, runningBalance, riskPercent);
      const pnl = this.toFiniteNumber(trade.pnl);

      if (runningBalance !== null && pnl !== null) {
        runningBalance += pnl;
      } else {
        runningBalance = null;
      }

      return tradeView;
    });
  }

  private toDomainTrade(
    trade: BacktestTrade,
    entryBalance: number | null,
    riskPercent: number | null,
  ): BacktestTradeView {
    const pnl = this.toFiniteNumber(trade.pnl);
    const canCompute =
      entryBalance !== null &&
      entryBalance > 0 &&
      riskPercent !== null &&
      riskPercent > 0 &&
      pnl !== null;
    const riskAmountAtEntry = canCompute
      ? ((entryBalance * riskPercent) / 100).toFixed(8)
      : null;
    const equityImpactPercent = canCompute
      ? (pnl / entryBalance) * 100
      : null;

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
      riskAmountAtEntry,
      equityImpactPercent,
      status: trade.status,
      createdAt: trade.createdAt,
    };
  }

  private toFiniteNumber(value: unknown): number | null {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private toPrismaJson(value: Record<string, unknown>): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
