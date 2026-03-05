import { Inject, Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import {
  IN_PLAY_RUN_REPOSITORY_TOKEN,
  type IInPlayRunRepository,
} from 'src/backtesting/domain/interfaces/in-play-run-repository.interface';
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
import { MetricsCalculator } from 'src/backtesting/infrastructure/trade-simulation/metrics.calculator';
import { RunInPlayBacktestRequestDto } from 'src/backtesting/interfaces/dtos/run-in-play-backtest-request.dto';
import { RunInPlayBacktestResponseDto } from 'src/backtesting/interfaces/dtos/run-in-play-backtest-response.dto';

type TimeWindow = { fromTime: bigint; toTime: bigint };

@Injectable()
export class RunInPlayBacktestUseCase {
  private static readonly DEFAULT_MIN_FVG_SIZE_PERCENT = 0.8;
  private static readonly DEFAULT_MAX_FVG_SIZE_PERCENT = 4;

  constructor(
    @Inject(IN_PLAY_RUN_REPOSITORY_TOKEN)
    private readonly inPlayRepository: IInPlayRunRepository,
    @Inject(MARKET_DATA_REPOSITORY_TOKEN)
    private readonly marketDataRepository: IMarketDataRepository,
    @Inject(STRATEGY_EVALUATOR_TOKEN)
    private readonly strategyEvaluator: IStrategyEvaluator,
    @Inject(TRADE_SIMULATOR_TOKEN)
    private readonly tradeSimulator: ITradeSimulator,
  ) {}

  public async execute(
    runId: string,
    request: RunInPlayBacktestRequestDto,
  ): Promise<RunInPlayBacktestResponseDto | null> {
    const symbol = request.symbol?.toUpperCase();
    const windows = await this.inPlayRepository.listEntryWindows(runId, symbol);
    if (!windows) {
      return null;
    }

    const minFvgSizePercent =
      request.minFvgSizePercent ??
      RunInPlayBacktestUseCase.DEFAULT_MIN_FVG_SIZE_PERCENT;
    const maxFvgSizePercent =
      request.maxFvgSizePercent ??
      RunInPlayBacktestUseCase.DEFAULT_MAX_FVG_SIZE_PERCENT;
    if (minFvgSizePercent > maxFvgSizePercent) {
      throw new Error(
        'minFvgSizePercent must be less than or equal to maxFvgSizePercent',
      );
    }

    const riskModel = RiskModel.from(
      request.riskPercent ?? 2,
      request.rewardRatio ?? 2,
    );
    const initialBalance = request.initialBalance ?? 10_000;

    const bySymbol = new Map<string, TimeWindow[]>();
    for (const window of windows) {
      const arr = bySymbol.get(window.symbol) ?? [];
      arr.push({
        fromTime: BigInt(window.fromTime),
        toTime: BigInt(window.toTime),
      });
      bySymbol.set(window.symbol, arr);
    }

    let processedCandles = 0;
    let generatedSignals = 0;
    let totalTrades = 0;
    let winningTrades = 0;
    let losingTrades = 0;
    let totalPnL = new Decimal(0);
    let mergedWindowsCount = 0;
    let overallDiagnostics: Record<string, number> = {};

    const perSymbol: RunInPlayBacktestResponseDto['perSymbol'] = [];
    for (const [currentSymbol, symbolWindows] of bySymbol.entries()) {
      this.strategyEvaluator.reset();
      this.tradeSimulator.reset();
      this.strategyEvaluator.configure?.({
        minFvgSizePercent,
        maxFvgSizePercent,
      });

      const mergedWindows = this.mergeWindows(symbolWindows);
      mergedWindowsCount += mergedWindows.length;

      let symbolProcessedCandles = 0;
      let symbolGeneratedSignals = 0;

      for (const mergedWindow of mergedWindows) {
        const processed = await this.processWindow(
          currentSymbol,
          mergedWindow.fromTime,
          mergedWindow.toTime,
          riskModel,
        );
        symbolProcessedCandles += processed.processedCandles;
        symbolGeneratedSignals += processed.generatedSignals;
      }

      const trades = this.tradeSimulator.getClosedTrades();
      const metrics = MetricsCalculator.calculateMetrics(trades, initialBalance);
      const diagnostics = this.strategyEvaluator.getDiagnostics?.() ?? {};

      processedCandles += symbolProcessedCandles;
      generatedSignals += symbolGeneratedSignals;
      totalTrades += metrics.totalTrades;
      winningTrades += metrics.winningTrades;
      losingTrades += metrics.losingTrades;
      totalPnL = totalPnL.plus(metrics.totalPnL);
      overallDiagnostics = this.mergeDiagnostics(overallDiagnostics, diagnostics);

      perSymbol.push({
        symbol: currentSymbol,
        windows: symbolWindows.length,
        mergedWindows: mergedWindows.length,
        processedCandles: symbolProcessedCandles,
        generatedSignals: symbolGeneratedSignals,
        totalTrades: metrics.totalTrades,
        winningTrades: metrics.winningTrades,
        losingTrades: metrics.losingTrades,
        winRate: Number(metrics.winRate),
        totalPnL: metrics.totalPnL,
        diagnostics,
      });
    }

    const overallWinRate =
      totalTrades > 0 ? Number(((winningTrades / totalTrades) * 100).toFixed(2)) : 0;

    return {
      runId,
      status: 'completed',
      symbolsProcessed: bySymbol.size,
      windows: windows.length,
      mergedWindows: mergedWindowsCount,
      processedCandles,
      generatedSignals,
      totalTrades,
      winningTrades,
      losingTrades,
      winRate: overallWinRate,
      totalPnL: totalPnL.toFixed(2),
      diagnostics: overallDiagnostics,
      perSymbol,
    };
  }

  private async processWindow(
    symbol: string,
    fromTime: bigint,
    toTime: bigint,
    riskModel: RiskModel,
  ): Promise<{ processedCandles: number; generatedSignals: number }> {
    const fromInterval = Timeframe.from('1m');
    const toInterval = Timeframe.from('15m');
    const start = Timestamp.fromMs(fromTime);
    const end = Timestamp.fromMs(toTime);

    let processedCandles = 0;
    let generatedSignals = 0;
    let lastCandle: Candle | null = null;

    const higherTimeframeIterator = this.marketDataRepository
      .getAggregatedStream(symbol, fromInterval, toInterval, start, end)
      [Symbol.asyncIterator]();
    const higherTimeframeStep = await higherTimeframeIterator.next();
    let activeHigherTimeframeCandle = higherTimeframeStep.done
      ? null
      : higherTimeframeStep.value;

    for await (const candle of this.marketDataRepository.getCandleStream(
      symbol,
      fromInterval.toString(),
      start,
      end,
    )) {
      processedCandles += 1;
      lastCandle = candle;

      while (
        activeHigherTimeframeCandle &&
        candle.getOpenTime().isAfter(activeHigherTimeframeCandle.getCloseTime())
      ) {
        const step = await higherTimeframeIterator.next();
        activeHigherTimeframeCandle = step.done ? null : step.value;
      }

      const higherCandleContext = this.isClosedHigherContextForLowerCandle(
        candle,
        activeHigherTimeframeCandle,
      )
        ? activeHigherTimeframeCandle
        : null;

      this.tradeSimulator.closeOpenTrade(candle, 'risk_check');
      const signals = this.strategyEvaluator.evaluate(candle, higherCandleContext);
      generatedSignals += signals.length;
      for (const signal of signals) {
        this.tradeSimulator.processSignal(signal, riskModel);
      }
    }

    if (lastCandle && this.tradeSimulator.getOpenTrade()) {
      this.tradeSimulator.closeOpenTrade(lastCandle, 'window_end');
    }

    return { processedCandles, generatedSignals };
  }

  private mergeWindows(windows: TimeWindow[]): TimeWindow[] {
    if (windows.length === 0) {
      return [];
    }
    const sorted = [...windows].sort((a, b) => {
      if (a.fromTime < b.fromTime) return -1;
      if (a.fromTime > b.fromTime) return 1;
      if (a.toTime < b.toTime) return -1;
      if (a.toTime > b.toTime) return 1;
      return 0;
    });

    const merged: TimeWindow[] = [{ ...sorted[0] }];
    for (let index = 1; index < sorted.length; index += 1) {
      const current = sorted[index];
      const last = merged[merged.length - 1];
      if (current.fromTime <= last.toTime) {
        if (current.toTime > last.toTime) {
          last.toTime = current.toTime;
        }
        continue;
      }
      merged.push({ ...current });
    }
    return merged;
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

  private isClosedHigherContextForLowerCandle(
    lowerCandle: Candle,
    higherCandle: Candle | null,
  ): higherCandle is Candle {
    return (
      this.inRange(lowerCandle, higherCandle) &&
      lowerCandle.getCloseTime().isAfterOrEqual(higherCandle.getCloseTime())
    );
  }

  private mergeDiagnostics(
    acc: Record<string, number>,
    value: Record<string, number>,
  ): Record<string, number> {
    const result = { ...acc };
    for (const [key, count] of Object.entries(value)) {
      result[key] = (result[key] ?? 0) + count;
    }
    return result;
  }
}
