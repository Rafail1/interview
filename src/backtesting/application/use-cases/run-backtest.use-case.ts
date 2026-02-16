import { Inject, Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import {
  BACKTEST_RUN_REPOSITORY_TOKEN,
  type IBacktestRunRepository,
} from 'src/backtesting/domain/interfaces/backtest-run-repository.interface';
import { MetricsCalculator } from 'src/backtesting/infrastructure/trade-simulation/metrics.calculator';
import { RunBacktestRequestDto } from 'src/backtesting/interfaces/dtos/run-backtest-request.dto';
import {
  MARKET_DATA_REPOSITORY_TOKEN,
  type IMarketDataRepository,
} from 'src/backtesting/domain/interfaces/market-data-repository.interface';
import {
  STRATEGY_EVALUATOR_TOKEN,
  type IStrategyEvaluator,
} from 'src/backtesting/domain/interfaces/strategy-evaluator.interface';
import {
  TRADE_SIMULATOR_TOKEN,
  type ITradeSimulator,
} from 'src/backtesting/domain/interfaces/trade-simulator.interface';
import { RiskModel } from 'src/backtesting/domain/value-objects/risk-model.value-object';
import { Timeframe } from 'src/backtesting/domain/value-objects/timeframe.value-object';
import { Timestamp } from 'src/backtesting/domain/value-objects/timestamp.value-object';

@Injectable()
export class RunBacktestUseCase {
  constructor(
    @Inject(MARKET_DATA_REPOSITORY_TOKEN)
    private readonly marketDataRepository: IMarketDataRepository,
    @Inject(STRATEGY_EVALUATOR_TOKEN)
    private readonly strategyEvaluator: IStrategyEvaluator,
    @Inject(TRADE_SIMULATOR_TOKEN)
    private readonly tradeSimulator: ITradeSimulator,
    @Inject(BACKTEST_RUN_REPOSITORY_TOKEN)
    private readonly backtestRunRepository: IBacktestRunRepository,
  ) {}

  public async execute(command: RunBacktestRequestDto) {
    const fromInterval = Timeframe.from(command.fromInterval ?? '1m');
    const toInterval = Timeframe.from(command.toInterval ?? '15m');
    const start = Timestamp.fromMs(new Date(command.startDate).getTime());
    const end = Timestamp.fromMs(new Date(command.endDate).getTime());

    if (start.isAfter(end)) {
      throw new Error('startDate must be before or equal to endDate');
    }

    this.strategyEvaluator.reset();
    this.tradeSimulator.reset();

    const riskModel = RiskModel.from(
      command.riskPercent ?? 2,
      command.rewardRatio ?? 2,
    );
    const initialBalance = command.initialBalance ?? 10_000;
    const persistedSignals: Array<{
      timestampMs: bigint;
      signalType: 'BUY' | 'SELL' | 'INVALID';
      reason: string;
      price: string;
      metadata?: Record<string, unknown>;
    }> = [];

    let processedCandles = 0;
    let generatedSignals = 0;
    let lastCandle: Parameters<IStrategyEvaluator['evaluate']>[0] | null = null;
    const useSameTimeframeContext = fromInterval.equals(toInterval);
    let higherTimeframeIterator: AsyncIterator<
      Candle,
      unknown,
      undefined
    > | null = null;
    let activeHigherTimeframeCandle: Candle | null = null;

    if (!useSameTimeframeContext) {
      higherTimeframeIterator = this.marketDataRepository
        .getAggregatedStream(
          command.symbol,
          fromInterval,
          toInterval,
          start,
          end,
        )
        [Symbol.asyncIterator]();
      const higherTimeframeStep = await higherTimeframeIterator.next();
      activeHigherTimeframeCandle = higherTimeframeStep.done
        ? null
        : higherTimeframeStep.value;
    }

    for await (const candle of this.marketDataRepository.getCandleStream(
      command.symbol,
      fromInterval.toString(),
      start,
      end,
    )) {
      processedCandles += 1;
      lastCandle = candle;

      while (
        !useSameTimeframeContext &&
        higherTimeframeIterator &&
        activeHigherTimeframeCandle &&
        candle.getOpenTime().isAfter(activeHigherTimeframeCandle.getCloseTime())
      ) {
        const higherTimeframeStep = await higherTimeframeIterator.next();
        activeHigherTimeframeCandle = higherTimeframeStep.done
          ? null
          : higherTimeframeStep.value;
      }

      const higherCandleContext = useSameTimeframeContext
        ? candle
        : this.inRange(candle, activeHigherTimeframeCandle)
          ? activeHigherTimeframeCandle
          : null;

      const signals = this.strategyEvaluator.evaluate(
        candle,
        higherCandleContext,
      );
      generatedSignals += signals.length;

      for (const signal of signals) {
        persistedSignals.push({
          timestampMs: signal.getTime().toMs(),
          signalType: signal.getType(),
          reason: signal.getReason(),
          price: signal.getPrice().toString(),
          metadata: signal.getMetadata(),
        });

        const existing = this.tradeSimulator.getOpenTrade();
        if (existing && signal.getType() !== 'INVALID') {
          this.tradeSimulator.closeOpenTrade(candle, 'new_signal');
        }
        this.tradeSimulator.processSignal(signal, riskModel);
      }
    }

    if (lastCandle && this.tradeSimulator.getOpenTrade()) {
      this.tradeSimulator.closeOpenTrade(lastCandle, 'end_of_backtest');
    }

    const closedTrades = this.tradeSimulator.getClosedTrades();
    const metrics = MetricsCalculator.calculateMetrics(
      closedTrades,
      initialBalance,
    );
    const equityPoints = this.buildEquityPoints(
      closedTrades,
      initialBalance,
      start,
    );
    const runId = await this.backtestRunRepository.saveRun({
      symbol: command.symbol,
      interval: toInterval.toString(),
      strategyVersion: 'fvg-bos-v1',
      config: {
        fromInterval: fromInterval.toString(),
        toInterval: toInterval.toString(),
        initialBalance,
        riskPercent: command.riskPercent ?? 2,
        rewardRatio: command.rewardRatio ?? 2,
      },
      startTimeMs: start.toMs(),
      endTimeMs: end.toMs(),
      metrics: {
        totalTrades: metrics.totalTrades,
        winningTrades: metrics.winningTrades,
        losingTrades: metrics.losingTrades,
        winRate: metrics.winRate,
        totalPnL: metrics.totalPnL,
        maxDrawdown: metrics.maxDrawdown,
        sharpeRatio: metrics.sharpeRatio,
        profitFactor: metrics.profitFactor,
        avgWin: metrics.avgWin,
        avgLoss: metrics.avgLoss,
      },
      trades: closedTrades,
      signals: persistedSignals,
      equityPoints,
    });

    return {
      runId,
      symbol: command.symbol,
      fromInterval: fromInterval.toString(),
      toInterval: toInterval.toString(),
      processedCandles,
      generatedSignals,
      metrics,
    };
  }

  private buildEquityPoints(
    closedTrades: ReturnType<ITradeSimulator['getClosedTrades']>,
    initialBalance: number,
    start: Timestamp,
  ): Array<{
    timestampMs: bigint;
    equity: string;
    drawdown: string;
  }> {
    const points: Array<{
      timestampMs: bigint;
      equity: string;
      drawdown: string;
    }> = [];

    let equity = new Decimal(initialBalance);
    let peakEquity = equity;

    points.push({
      timestampMs: start.toMs(),
      equity: equity.toString(),
      drawdown: '0',
    });

    const sortedTrades = [...closedTrades].sort((a, b) => {
      const aTime = (a.getExitTime() ?? a.getEntryTime()).toMs();
      const bTime = (b.getExitTime() ?? b.getEntryTime()).toMs();
      if (aTime < bTime) {
        return -1;
      }
      if (aTime > bTime) {
        return 1;
      }
      return 0;
    });

    for (const trade of sortedTrades) {
      equity = equity.plus(trade.getPnL() ?? 0);
      if (equity.greaterThan(peakEquity)) {
        peakEquity = equity;
      }
      const drawdown = peakEquity.minus(equity);
      points.push({
        timestampMs: (trade.getExitTime() ?? trade.getEntryTime()).toMs(),
        equity: equity.toString(),
        drawdown: drawdown.toString(),
      });
    }

    return points;
  }

  private inRange(
    lowerCandle: Candle,
    higherCandle: Candle | null,
  ): higherCandle is Candle {
    if (!higherCandle) {
      return false;
    }
    return (
      lowerCandle.getOpenTime().isAfterOrEqual(higherCandle.getOpenTime()) &&
      lowerCandle.getOpenTime().isBeforeOrEqual(higherCandle.getCloseTime())
    );
  }
}
