import { Inject, Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import { Signal } from 'src/backtesting/domain/entities/signal.entity';
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

type FvgBounds = { lower: Decimal; upper: Decimal };

type ExperimentalTrade = {
  side: 'BUY' | 'SELL';
  entryPrice: Decimal;
  stopPrice: Decimal;
  takePrice: Decimal;
};

type SignalFilter = (
  input: {
    candle: Candle;
    previousCandle: Candle | null;
    signal: Signal;
  },
) => boolean;

type StopLossResolver = (input: {
  candle: Candle;
  signal: Signal;
  side: 'BUY' | 'SELL';
  riskPercent: number;
}) => Decimal | null;

class ExperimentalFilterBacktester {
  private readonly fixedRiskAmount: Decimal;
  private readonly fallbackRewardRatio: Decimal;
  private readonly fallbackRiskPercent: number;
  private acceptedSignals = 0;
  private totalTrades = 0;
  private winningTrades = 0;
  private losingTrades = 0;
  private totalPnL = new Decimal(0);
  private openTrade: ExperimentalTrade | null = null;

  constructor(
    readonly code: string,
    readonly description: string,
    private readonly signalFilter: SignalFilter,
    private readonly stopLossResolver: StopLossResolver,
    initialBalance: number,
    rewardRatio: number,
    riskPercent: number,
  ) {
    this.fixedRiskAmount = new Decimal(initialBalance).times(0.01);
    this.fallbackRewardRatio = new Decimal(rewardRatio);
    this.fallbackRiskPercent = riskPercent;
  }

  public onCandle(
    candle: Candle,
    previousCandle: Candle | null,
    signals: Signal[],
  ): void {
    this.closeTradeIfNeeded(candle);

    if (this.openTrade) {
      return;
    }

    for (const signal of signals) {
      const side = signal.getType();
      if (side !== 'BUY' && side !== 'SELL') {
        continue;
      }

      if (!this.signalFilter({ candle, previousCandle, signal })) {
        continue;
      }

      const entryPrice = signal.getPrice().toDecimal();
      const stopPrice = this.stopLossResolver({
        candle,
        signal,
        side,
        riskPercent: this.fallbackRiskPercent,
      });

      if (!stopPrice) {
        continue;
      }

      const stopDistance =
        side === 'BUY'
          ? entryPrice.minus(stopPrice)
          : stopPrice.minus(entryPrice);
      if (stopDistance.lessThanOrEqualTo(0)) {
        continue;
      }

      const rewardRatio = this.code === 'directional_candle' ? new Decimal(2) : this.fallbackRewardRatio;
      const takeDistance = stopDistance.times(rewardRatio);
      const takePrice =
        side === 'BUY'
          ? entryPrice.plus(takeDistance)
          : entryPrice.minus(takeDistance);
      if (takePrice.lessThanOrEqualTo(0)) {
        continue;
      }

      this.openTrade = { side, entryPrice, stopPrice, takePrice };
      this.acceptedSignals += 1;
      break;
    }
  }

  public closeOpenAt(candle: Candle): void {
    if (!this.openTrade) {
      return;
    }
    this.closeTrade(candle.getClose().toDecimal());
  }

  public toResult() {
    const winRate =
      this.totalTrades > 0
        ? Number(((this.winningTrades / this.totalTrades) * 100).toFixed(2))
        : 0;
    return {
      code: this.code,
      description: this.description,
      acceptedSignals: this.acceptedSignals,
      totalTrades: this.totalTrades,
      winningTrades: this.winningTrades,
      losingTrades: this.losingTrades,
      winRate,
      totalPnL: this.totalPnL.toFixed(2),
    };
  }

  private closeTradeIfNeeded(candle: Candle): void {
    if (!this.openTrade) {
      return;
    }

    const { side, stopPrice, takePrice } = this.openTrade;
    const low = candle.getLow().toDecimal();
    const high = candle.getHigh().toDecimal();

    const hitStop = low.lessThanOrEqualTo(stopPrice) && high.greaterThanOrEqualTo(stopPrice);
    const hitTake = low.lessThanOrEqualTo(takePrice) && high.greaterThanOrEqualTo(takePrice);

    if (side === 'BUY') {
      if (hitStop) {
        this.closeTrade(stopPrice);
        return;
      }
      if (hitTake) {
        this.closeTrade(takePrice);
      }
      return;
    }

    if (hitStop) {
      this.closeTrade(stopPrice);
      return;
    }
    if (hitTake) {
      this.closeTrade(takePrice);
    }
  }

  private closeTrade(exitPrice: Decimal): void {
    if (!this.openTrade) {
      return;
    }
    const { side, entryPrice, stopPrice } = this.openTrade;
    const stopDistance =
      side === 'BUY'
        ? entryPrice.minus(stopPrice)
        : stopPrice.minus(entryPrice);
    if (stopDistance.lessThanOrEqualTo(0)) {
      this.openTrade = null;
      return;
    }
    const quantity = this.fixedRiskAmount.dividedBy(stopDistance);
    const pnl =
      side === 'BUY'
        ? quantity.times(exitPrice.minus(entryPrice))
        : quantity.times(entryPrice.minus(exitPrice));
    this.totalPnL = this.totalPnL.plus(pnl);
    this.totalTrades += 1;
    if (pnl.greaterThan(0)) {
      this.winningTrades += 1;
    } else if (pnl.lessThan(0)) {
      this.losingTrades += 1;
    }
    this.openTrade = null;
  }
}

type PendingExitFallback = {
  side: 'BUY' | 'SELL';
  bounds: FvgBounds;
};

class ExitFallbackBacktester {
  private readonly fixedRiskAmount: Decimal;
  private readonly rewardRatio: Decimal;
  private acceptedSignals = 0;
  private totalTrades = 0;
  private winningTrades = 0;
  private losingTrades = 0;
  private totalPnL = new Decimal(0);
  private openTrade: ExperimentalTrade | null = null;
  private pending: PendingExitFallback | null = null;

  constructor(
    readonly code: string,
    readonly description: string,
    private readonly isAnyPrimaryTriggerMatched: SignalFilter,
    private readonly extractFvgBounds: (signal: Signal) => FvgBounds | null,
    initialBalance: number,
    private readonly fallbackRiskPercent: number,
    rewardRatio: number,
  ) {
    this.fixedRiskAmount = new Decimal(initialBalance).times(0.01);
    this.rewardRatio = new Decimal(rewardRatio);
  }

  public onCandle(
    candle: Candle,
    previousCandle: Candle | null,
    signals: Signal[],
  ): void {
    this.closeTradeIfNeeded(candle);
    if (!this.openTrade && this.pending && this.isExitCandle(candle, this.pending)) {
      this.tryOpenTradeFromExit(candle, this.pending.side, this.pending.bounds);
      this.pending = null;
    }
    if (this.openTrade) {
      return;
    }

    for (const signal of signals) {
      const side = signal.getType();
      if (side !== 'BUY' && side !== 'SELL') {
        continue;
      }
      const bounds = this.extractFvgBounds(signal);
      if (!bounds) {
        continue;
      }
      if (this.isAnyPrimaryTriggerMatched({ candle, previousCandle, signal })) {
        this.pending = null;
        continue;
      }
      this.pending = { side, bounds };
    }
  }

  public closeOpenAt(candle: Candle): void {
    if (!this.openTrade) {
      return;
    }
    this.closeTrade(candle.getClose().toDecimal());
  }

  public toResult() {
    const winRate =
      this.totalTrades > 0
        ? Number(((this.winningTrades / this.totalTrades) * 100).toFixed(2))
        : 0;
    return {
      code: this.code,
      description: this.description,
      acceptedSignals: this.acceptedSignals,
      totalTrades: this.totalTrades,
      winningTrades: this.winningTrades,
      losingTrades: this.losingTrades,
      winRate,
      totalPnL: this.totalPnL.toFixed(2),
    };
  }

  private isExitCandle(candle: Candle, pending: PendingExitFallback): boolean {
    const close = candle.getClose().toDecimal();
    if (pending.side === 'BUY') {
      return close.greaterThan(pending.bounds.upper);
    }
    return close.lessThan(pending.bounds.lower);
  }

  private tryOpenTradeFromExit(
    candle: Candle,
    side: 'BUY' | 'SELL',
    bounds: FvgBounds,
  ): void {
    const entryPrice = candle.getClose().toDecimal();
    const structureStop = side === 'BUY' ? bounds.lower : bounds.upper;
    let stopPrice = structureStop;
    const validStructure =
      side === 'BUY'
        ? structureStop.lessThan(entryPrice)
        : structureStop.greaterThan(entryPrice);
    if (!validStructure || structureStop.lessThanOrEqualTo(0)) {
      const fallbackDistance = entryPrice.times(this.fallbackRiskPercent).dividedBy(100);
      if (fallbackDistance.lessThanOrEqualTo(0)) {
        return;
      }
      stopPrice =
        side === 'BUY'
          ? entryPrice.minus(fallbackDistance)
          : entryPrice.plus(fallbackDistance);
    }

    const stopDistance =
      side === 'BUY'
        ? entryPrice.minus(stopPrice)
        : stopPrice.minus(entryPrice);
    if (stopDistance.lessThanOrEqualTo(0)) {
      return;
    }
    const takeDistance = stopDistance.times(this.rewardRatio);
    const takePrice =
      side === 'BUY'
        ? entryPrice.plus(takeDistance)
        : entryPrice.minus(takeDistance);
    if (takePrice.lessThanOrEqualTo(0)) {
      return;
    }
    this.openTrade = {
      side,
      entryPrice,
      stopPrice,
      takePrice,
    };
    this.acceptedSignals += 1;
  }

  private closeTradeIfNeeded(candle: Candle): void {
    if (!this.openTrade) {
      return;
    }

    const { side, stopPrice, takePrice } = this.openTrade;
    const low = candle.getLow().toDecimal();
    const high = candle.getHigh().toDecimal();

    const hitStop = low.lessThanOrEqualTo(stopPrice) && high.greaterThanOrEqualTo(stopPrice);
    const hitTake = low.lessThanOrEqualTo(takePrice) && high.greaterThanOrEqualTo(takePrice);

    if (side === 'BUY') {
      if (hitStop) {
        this.closeTrade(stopPrice);
        return;
      }
      if (hitTake) {
        this.closeTrade(takePrice);
      }
      return;
    }

    if (hitStop) {
      this.closeTrade(stopPrice);
      return;
    }
    if (hitTake) {
      this.closeTrade(takePrice);
    }
  }

  private closeTrade(exitPrice: Decimal): void {
    if (!this.openTrade) {
      return;
    }
    const { side, entryPrice, stopPrice } = this.openTrade;
    const stopDistance =
      side === 'BUY'
        ? entryPrice.minus(stopPrice)
        : stopPrice.minus(entryPrice);
    if (stopDistance.lessThanOrEqualTo(0)) {
      this.openTrade = null;
      return;
    }
    const quantity = this.fixedRiskAmount.dividedBy(stopDistance);
    const pnl =
      side === 'BUY'
        ? quantity.times(exitPrice.minus(entryPrice))
        : quantity.times(entryPrice.minus(exitPrice));
    this.totalPnL = this.totalPnL.plus(pnl);
    this.totalTrades += 1;
    if (pnl.greaterThan(0)) {
      this.winningTrades += 1;
    } else if (pnl.lessThan(0)) {
      this.losingTrades += 1;
    }
    this.openTrade = null;
  }
}

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
    const filterBacktesters = this.createFilterBacktesters(
      initialBalance,
      riskModel.getRewardRatio(),
      riskModel.getRiskPercent(),
    );
    const exitFallbackBacktester = this.createExitFallbackBacktester(
      initialBalance,
      riskModel.getRewardRatio(),
      riskModel.getRiskPercent(),
    );

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
      let symbolSkippedNo1mDataWindows = 0;

      for (const mergedWindow of mergedWindows) {
        const processed = await this.processWindow(
          currentSymbol,
          mergedWindow.fromTime,
          mergedWindow.toTime,
          riskModel,
          filterBacktesters,
          exitFallbackBacktester,
        );
        symbolProcessedCandles += processed.processedCandles;
        symbolGeneratedSignals += processed.generatedSignals;
        if (processed.skippedNo1mData) {
          symbolSkippedNo1mDataWindows += 1;
        }
      }

      const trades = this.tradeSimulator.getClosedTrades();
      const metrics = MetricsCalculator.calculateMetrics(trades, initialBalance);
      const diagnostics = this.strategyEvaluator.getDiagnostics?.() ?? {};
      const diagnosticsWithDataAvailability = {
        ...diagnostics,
        skippedNo1mDataWindows: symbolSkippedNo1mDataWindows,
      };

      processedCandles += symbolProcessedCandles;
      generatedSignals += symbolGeneratedSignals;
      totalTrades += metrics.totalTrades;
      winningTrades += metrics.winningTrades;
      losingTrades += metrics.losingTrades;
      totalPnL = totalPnL.plus(metrics.totalPnL);
      overallDiagnostics = this.mergeDiagnostics(
        overallDiagnostics,
        diagnosticsWithDataAvailability,
      );

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
        diagnostics: diagnosticsWithDataAvailability,
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
      filterResults: [
        ...filterBacktesters.map((item) => item.toResult()),
        exitFallbackBacktester.toResult(),
      ],
    };
  }

  private async processWindow(
    symbol: string,
    fromTime: bigint,
    toTime: bigint,
    riskModel: RiskModel,
    filterBacktesters: ExperimentalFilterBacktester[],
    exitFallbackBacktester: ExitFallbackBacktester,
  ): Promise<{
    processedCandles: number;
    generatedSignals: number;
    skippedNo1mData: boolean;
  }> {
    const fromInterval = Timeframe.from('1m');
    const toInterval = Timeframe.from('15m');
    const start = Timestamp.fromMs(fromTime);
    const end = Timestamp.fromMs(toTime);

    const has1mData = await this.marketDataRepository.hasData(
      symbol,
      fromInterval.toString(),
      start,
      end,
    );
    if (!has1mData) {
      return { processedCandles: 0, generatedSignals: 0, skippedNo1mData: true };
    }

    let processedCandles = 0;
    let generatedSignals = 0;
    let lastCandle: Candle | null = null;
    let previousCandle: Candle | null = null;

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
      for (const backtester of filterBacktesters) {
        backtester.onCandle(candle, previousCandle, signals);
      }
      exitFallbackBacktester.onCandle(candle, previousCandle, signals);
      previousCandle = candle;
    }

    if (lastCandle && this.tradeSimulator.getOpenTrade()) {
      this.tradeSimulator.closeOpenTrade(lastCandle, 'window_end');
    }
    if (lastCandle) {
      for (const backtester of filterBacktesters) {
        backtester.closeOpenAt(lastCandle);
      }
      exitFallbackBacktester.closeOpenAt(lastCandle);
    }

    return { processedCandles, generatedSignals, skippedNo1mData: false };
  }

  private createFilterBacktesters(
    initialBalance: number,
    rewardRatio: number,
    riskPercent: number,
  ): ExperimentalFilterBacktester[] {
    const stopFromFvgOrRisk: StopLossResolver = ({ signal, side, candle }) => {
      const fvg = this.extractFvgBounds(signal);
      const entry = signal.getPrice().toDecimal();
      if (fvg) {
        const structureStop = side === 'BUY' ? fvg.lower : fvg.upper;
        const valid =
          side === 'BUY'
            ? structureStop.lessThan(entry)
            : structureStop.greaterThan(entry);
        if (valid && structureStop.greaterThan(0)) {
          return structureStop;
        }
      }

      const distance = entry.times(riskPercent).dividedBy(100);
      if (distance.lessThanOrEqualTo(0)) {
        return null;
      }
      const stop = side === 'BUY' ? entry.minus(distance) : entry.plus(distance);
      if (stop.lessThanOrEqualTo(0)) {
        return null;
      }
      return stop;
    };

    const stopBehindSignalCandle: StopLossResolver = ({ candle, side }) => {
      const stop = side === 'BUY' ? candle.getLow().toDecimal() : candle.getHigh().toDecimal();
      return stop.greaterThan(0) ? stop : null;
    };

    return [
      new ExperimentalFilterBacktester(
        'fvg_deceleration',
        'Entry only when candle range contracts inside touched FVG zone',
        ({ candle, previousCandle, signal }) => {
          if (!previousCandle) {
            return false;
          }
          const currentRange = candle.getHigh().toDecimal().minus(candle.getLow().toDecimal()).abs();
          const prevRange = previousCandle
            .getHigh()
            .toDecimal()
            .minus(previousCandle.getLow().toDecimal())
            .abs();
          if (currentRange.greaterThanOrEqualTo(prevRange)) {
            return false;
          }
          const fvg = this.extractFvgBounds(signal);
          if (!fvg) {
            return false;
          }
          return (
            this.candleIntersectsZone(candle, fvg) &&
            this.candleIntersectsZone(previousCandle, fvg)
          );
        },
        stopFromFvgOrRisk,
        initialBalance,
        rewardRatio,
        riskPercent,
      ),
      new ExperimentalFilterBacktester(
        'directional_candle',
        'Entry only on directional candle, stop behind signal candle, RR 2:1',
        ({ candle, signal }) =>
          (signal.getType() === 'BUY' && candle.isBullish()) ||
          (signal.getType() === 'SELL' && candle.isBearish()),
        stopBehindSignalCandle,
        initialBalance,
        2,
        riskPercent,
      ),
      new ExperimentalFilterBacktester(
        'volume_color_divergence',
        'Entry only on taker-volume/color divergence candle',
        ({ candle, signal }) => {
          const quoteVolume = candle.getOHLCV().getQuoteAssetVolume();
          const takerBuyQuote = candle.getOHLCV().getTakerBuyQuoteVolume();
          const takerSellQuote = quoteVolume.minus(takerBuyQuote);
          if (signal.getType() === 'BUY') {
            return candle.isBearish() && takerBuyQuote.greaterThan(takerSellQuote);
          }
          if (signal.getType() === 'SELL') {
            return candle.isBullish() && takerSellQuote.greaterThan(takerBuyQuote);
          }
          return false;
        },
        stopFromFvgOrRisk,
        initialBalance,
        rewardRatio,
        riskPercent,
      ),
    ];
  }

  private createExitFallbackBacktester(
    initialBalance: number,
    rewardRatio: number,
    riskPercent: number,
  ): ExitFallbackBacktester {
    return new ExitFallbackBacktester(
      'fvg_exit_fallback',
      'Fallback entry on directional exit from FVG when none of primary triggers fired',
      ({ candle, previousCandle, signal }) =>
        this.isAnyPrimaryTriggerMatched(candle, previousCandle, signal),
      (signal) => this.extractFvgBounds(signal),
      initialBalance,
      riskPercent,
      rewardRatio,
    );
  }

  private isAnyPrimaryTriggerMatched(
    candle: Candle,
    previousCandle: Candle | null,
    signal: Signal,
  ): boolean {
    const directionalMatched =
      (signal.getType() === 'BUY' && candle.isBullish()) ||
      (signal.getType() === 'SELL' && candle.isBearish());

    const fvg = this.extractFvgBounds(signal);
    let decelerationMatched = false;
    if (previousCandle && fvg) {
      const currentRange = candle
        .getHigh()
        .toDecimal()
        .minus(candle.getLow().toDecimal())
        .abs();
      const prevRange = previousCandle
        .getHigh()
        .toDecimal()
        .minus(previousCandle.getLow().toDecimal())
        .abs();
      decelerationMatched =
        currentRange.lessThan(prevRange) &&
        this.candleIntersectsZone(candle, fvg) &&
        this.candleIntersectsZone(previousCandle, fvg);
    }

    const quoteVolume = candle.getOHLCV().getQuoteAssetVolume();
    const takerBuyQuote = candle.getOHLCV().getTakerBuyQuoteVolume();
    const takerSellQuote = quoteVolume.minus(takerBuyQuote);
    const volumeDivergenceMatched =
      (signal.getType() === 'BUY' &&
        candle.isBearish() &&
        takerBuyQuote.greaterThan(takerSellQuote)) ||
      (signal.getType() === 'SELL' &&
        candle.isBullish() &&
        takerSellQuote.greaterThan(takerBuyQuote));

    return directionalMatched || decelerationMatched || volumeDivergenceMatched;
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

  private extractFvgBounds(signal: Signal): FvgBounds | null {
    const metadata = signal.getMetadata();
    if (!metadata || typeof metadata !== 'object') {
      return null;
    }
    const fvg = (metadata as Record<string, unknown>).fvg;
    if (!fvg || typeof fvg !== 'object') {
      return null;
    }
    const lowerRaw = (fvg as Record<string, unknown>).lowerBound;
    const upperRaw = (fvg as Record<string, unknown>).upperBound;
    if (
      (typeof lowerRaw !== 'string' && typeof lowerRaw !== 'number') ||
      (typeof upperRaw !== 'string' && typeof upperRaw !== 'number')
    ) {
      return null;
    }
    try {
      const lower = new Decimal(lowerRaw);
      const upper = new Decimal(upperRaw);
      if (lower.lessThanOrEqualTo(0) || upper.lessThanOrEqualTo(0)) {
        return null;
      }
      return { lower, upper };
    } catch {
      return null;
    }
  }

  private candleIntersectsZone(candle: Candle, zone: FvgBounds): boolean {
    const candleLow = candle.getLow().toDecimal();
    const candleHigh = candle.getHigh().toDecimal();
    return candleLow.lessThanOrEqualTo(zone.upper) && candleHigh.greaterThanOrEqualTo(zone.lower);
  }
}
