import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import { FVGZone } from 'src/backtesting/domain/entities/fvg-zone.entity';
import { Signal } from 'src/backtesting/domain/entities/signal.entity';
import { StrategyEvaluator } from 'src/backtesting/infrastructure/signal-detection/strategy.evaluator';
import { FvgDetector } from 'src/backtesting/infrastructure/signal-detection/fvg.detector';
import { StructureDetector } from 'src/backtesting/infrastructure/signal-detection/structure.detector';
import {
  LOGGER_TOKEN,
  type ILogger,
} from 'src/core/interfaces/logger.interface';
import {
  IRealtimeSymbolTracker,
  RealtimeTrackedSymbolView,
  TrackSymbolsResult,
  UntrackSymbolResult,
} from 'src/realtime-signals/domain/interfaces/realtime-symbol-tracker.interface';
import {
  IRealtimeMarketDataClient,
  REALTIME_MARKET_DATA_CLIENT_TOKEN,
} from 'src/realtime-signals/domain/interfaces/realtime-market-data-client.interface';

type SymbolTrackerState = {
  symbol: string;
  startedAt: Date;
  fvgDetector: FvgDetector;
  structureDetector: StructureDetector;
  strategyEvaluator: StrategyEvaluator;
  enteredZoneIds: Set<string>;
  emittedEntrySignalKeys: Set<string>;
  lastProcessed15mCloseMs: bigint | null;
  lastProcessed1mCloseMs: bigint | null;
  isProcessing: boolean;
};

@Injectable()
export class RealtimeSymbolTrackerService
  implements IRealtimeSymbolTracker, OnModuleInit, OnModuleDestroy
{
  private static readonly LOG_CONTEXT = 'RealtimeSymbolTrackerService';
  private static readonly HISTORY_15M_LIMIT = 1000;
  private static readonly WARMUP_1M_LIMIT = 300;
  private static readonly POLL_1M_LIMIT = 200;
  private static readonly POLL_15M_LIMIT = 200;
  private static readonly DEFAULT_POLL_INTERVAL_MS = 15_000;
  private static readonly DEFAULT_MIN_FVG_SIZE_PERCENT = 0.8;
  private static readonly DEFAULT_MAX_FVG_SIZE_PERCENT = 4;
  private readonly states = new Map<string, SymbolTrackerState>();
  private pollTimer: NodeJS.Timeout | null = null;
  private readonly pollIntervalMs: number;
  private readonly minFvgSizePercent: number;
  private readonly maxFvgSizePercent: number;

  constructor(
    private readonly configService: ConfigService,
    @Inject(REALTIME_MARKET_DATA_CLIENT_TOKEN)
    private readonly marketDataClient: IRealtimeMarketDataClient,
    @Inject(LOGGER_TOKEN)
    private readonly logger: ILogger,
  ) {
    const pollMs = Number(
      this.configService.get<string>('REALTIME_SIGNALS_POLL_INTERVAL_MS') ??
        String(RealtimeSymbolTrackerService.DEFAULT_POLL_INTERVAL_MS),
    );
    this.pollIntervalMs =
      Number.isFinite(pollMs) && pollMs > 0
        ? Math.floor(pollMs)
        : RealtimeSymbolTrackerService.DEFAULT_POLL_INTERVAL_MS;

    this.minFvgSizePercent = Number(
      this.configService.get<string>('REALTIME_SIGNALS_MIN_FVG_SIZE_PERCENT') ??
        String(RealtimeSymbolTrackerService.DEFAULT_MIN_FVG_SIZE_PERCENT),
    );
    this.maxFvgSizePercent = Number(
      this.configService.get<string>('REALTIME_SIGNALS_MAX_FVG_SIZE_PERCENT') ??
        String(RealtimeSymbolTrackerService.DEFAULT_MAX_FVG_SIZE_PERCENT),
    );
  }

  public onModuleInit(): void {
    this.pollTimer = setInterval(() => {
      void this.pollAllSymbols();
    }, this.pollIntervalMs);
  }

  public onModuleDestroy(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.states.clear();
  }

  public async startTracking(symbols: string[]): Promise<TrackSymbolsResult> {
    const normalized = this.normalizeSymbols(symbols);
    if (normalized.length === 0) {
      throw new Error('symbols must contain at least one valid symbol');
    }

    const started: string[] = [];
    const alreadyTracking: string[] = [];

    for (const symbol of normalized) {
      if (this.states.has(symbol)) {
        alreadyTracking.push(symbol);
        continue;
      }
      const state = this.createState(symbol);
      await this.bootstrapState(state);
      this.states.set(symbol, state);
      started.push(symbol);
      this.logger.log(
        `Started realtime tracking symbol=${symbol} activeFvgs=${this.getActiveFvgCount(state)}`,
        RealtimeSymbolTrackerService.LOG_CONTEXT,
      );
    }

    return {
      started,
      alreadyTracking,
      tracked: this.getTrackedSymbols(),
    };
  }

  public stopTracking(symbol: string): UntrackSymbolResult {
    const normalized = this.normalizeSymbol(symbol);
    const stopped = this.states.delete(normalized);
    if (stopped) {
      this.logger.log(
        `Stopped realtime tracking symbol=${normalized}`,
        RealtimeSymbolTrackerService.LOG_CONTEXT,
      );
    }
    return {
      symbol: normalized,
      stopped,
      tracked: this.getTrackedSymbols(),
    };
  }

  public getTrackedSymbols(): RealtimeTrackedSymbolView[] {
    return Array.from(this.states.values())
      .map((state) => ({
        symbol: state.symbol,
        activeFvgCount: this.getActiveFvgCount(state),
        startedAt: state.startedAt.toISOString(),
      }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));
  }

  private async pollAllSymbols(): Promise<void> {
    const states = Array.from(this.states.values());
    await Promise.all(states.map((state) => this.processStateTick(state)));
  }

  private async processStateTick(state: SymbolTrackerState): Promise<void> {
    if (state.isProcessing) {
      return;
    }
    state.isProcessing = true;

    try {
      const nowMs = Date.now();
      const [candles15m, candles1m] = await Promise.all([
        this.marketDataClient.getRecentCandles(
          state.symbol,
          '15m',
          RealtimeSymbolTrackerService.POLL_15M_LIMIT,
        ),
        this.marketDataClient.getRecentCandles(
          state.symbol,
          '1m',
          RealtimeSymbolTrackerService.POLL_1M_LIMIT,
        ),
      ]);

      const closed15m = candles15m.filter((c) => c.getCloseTime().toMsNumber() <= nowMs);
      const closed1m = candles1m.filter((c) => c.getCloseTime().toMsNumber() <= nowMs);

      for (const candle15m of closed15m) {
        if (
          state.lastProcessed15mCloseMs !== null &&
          candle15m.getCloseTime().toMs() <= state.lastProcessed15mCloseMs
        ) {
          continue;
        }
        state.fvgDetector.detect(candle15m);
        state.lastProcessed15mCloseMs = candle15m.getCloseTime().toMs();
      }

      for (const candle1m of closed1m) {
        if (
          state.lastProcessed1mCloseMs !== null &&
          candle1m.getCloseTime().toMs() <= state.lastProcessed1mCloseMs
        ) {
          continue;
        }

        this.emitZoneTouchSignals(state, candle1m);

        const signals = state.strategyEvaluator.evaluate(candle1m, null);
        for (const signal of signals) {
          this.emitEntrySignal(state, signal);
        }

        state.lastProcessed1mCloseMs = candle1m.getCloseTime().toMs();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Realtime poll failed symbol=${state.symbol} reason=${message}`,
        undefined,
        RealtimeSymbolTrackerService.LOG_CONTEXT,
      );
    } finally {
      state.isProcessing = false;
    }
  }

  private async bootstrapState(state: SymbolTrackerState): Promise<void> {
    const nowMs = Date.now();
    const candles15m = await this.marketDataClient.getRecentCandles(
      state.symbol,
      '15m',
      RealtimeSymbolTrackerService.HISTORY_15M_LIMIT,
    );
    for (const candle of candles15m) {
      if (candle.getCloseTime().toMsNumber() > nowMs) {
        continue;
      }
      state.fvgDetector.detect(candle);
      state.lastProcessed15mCloseMs = candle.getCloseTime().toMs();
    }

    const warmup1m = await this.marketDataClient.getRecentCandles(
      state.symbol,
      '1m',
      RealtimeSymbolTrackerService.WARMUP_1M_LIMIT,
    );
    for (const candle of warmup1m) {
      if (candle.getCloseTime().toMsNumber() > nowMs) {
        continue;
      }
      state.structureDetector.detect(candle);
      state.lastProcessed1mCloseMs = candle.getCloseTime().toMs();
    }
  }

  private createState(symbol: string): SymbolTrackerState {
    const fvgDetector = new FvgDetector();
    const structureDetector = new StructureDetector();
    const strategyEvaluator = new StrategyEvaluator(fvgDetector, structureDetector);
    strategyEvaluator.configure({
      minFvgSizePercent: this.minFvgSizePercent,
      maxFvgSizePercent: this.maxFvgSizePercent,
    });

    return {
      symbol,
      startedAt: new Date(),
      fvgDetector,
      structureDetector,
      strategyEvaluator,
      enteredZoneIds: new Set<string>(),
      emittedEntrySignalKeys: new Set<string>(),
      lastProcessed15mCloseMs: null,
      lastProcessed1mCloseMs: null,
      isProcessing: false,
    };
  }

  private emitZoneTouchSignals(state: SymbolTrackerState, candle1m: Candle): void {
    const activeZones = state.fvgDetector
      .getCurrentState()
      .filter((zone) => !zone.isMitigated());
    for (const zone of activeZones) {
      const isTouching =
        candle1m.getLow().isLessThanOrEqual(zone.getUpperBound()) &&
        candle1m.getHigh().isGreaterThanOrEqual(zone.getLowerBound());
      if (!isTouching) {
        continue;
      }
      if (state.enteredZoneIds.has(zone.getId())) {
        continue;
      }
      state.enteredZoneIds.add(zone.getId());
      this.logger.log(
        JSON.stringify(this.buildZoneTouchPayload(state.symbol, candle1m, zone)),
        RealtimeSymbolTrackerService.LOG_CONTEXT,
      );
    }
  }

  private emitEntrySignal(state: SymbolTrackerState, signal: Signal): void {
    if (signal.getType() === 'INVALID') {
      return;
    }

    const key = `${signal.getType()}-${signal.getTime().toMs().toString()}-${signal.getPrice().toString()}`;
    if (state.emittedEntrySignalKeys.has(key)) {
      return;
    }
    state.emittedEntrySignalKeys.add(key);

    const metadata = signal.getMetadata();
    const reactedZoneId =
      metadata && typeof metadata.reactedZoneId === 'string'
        ? metadata.reactedZoneId
        : null;

    if (reactedZoneId && !state.enteredZoneIds.has(reactedZoneId)) {
      const zone = state
        .fvgDetector
        .getCurrentState()
        .find((item) => item.getId() === reactedZoneId);
      if (zone) {
        state.enteredZoneIds.add(reactedZoneId);
        this.logger.log(
          JSON.stringify(this.buildZoneTouchPayload(state.symbol, null, zone)),
          RealtimeSymbolTrackerService.LOG_CONTEXT,
        );
      }
    }

    this.logger.log(
      JSON.stringify({
        category: 'realtime_signal',
        stage: 'entry_confirmation',
        symbol: state.symbol,
        signalType: signal.getType(),
        price: signal.getPrice().toString(),
        timestampMs: signal.getTime().toMsNumber(),
        reason: signal.getReason(),
        metadata: signal.getMetadata() ?? null,
      }),
      RealtimeSymbolTrackerService.LOG_CONTEXT,
    );
  }

  private buildZoneTouchPayload(
    symbol: string,
    candle: Candle | null,
    zone: FVGZone,
  ): Record<string, unknown> {
    return {
      category: 'realtime_signal',
      stage: 'fvg_zone_touch',
      symbol,
      timestampMs: candle
        ? candle.getCloseTime().toMsNumber()
        : Date.now(),
      candle: candle ? candle.toJSON() : null,
      zone: zone.toJSON(),
    };
  }

  private getActiveFvgCount(state: SymbolTrackerState): number {
    return state.fvgDetector.getCurrentState().filter((zone) => !zone.isMitigated()).length;
  }

  private normalizeSymbols(symbols: string[]): string[] {
    const unique = new Set<string>();
    for (const symbol of symbols) {
      unique.add(this.normalizeSymbol(symbol));
    }
    return Array.from(unique.values());
  }

  private normalizeSymbol(symbol: string): string {
    const normalized = symbol.trim().toUpperCase();
    if (!/^[A-Z0-9_]+$/.test(normalized)) {
      throw new Error(`Invalid symbol: ${symbol}`);
    }
    return normalized;
  }
}

