import { Inject, Injectable } from '@nestjs/common';
import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import { FVGZone } from 'src/backtesting/domain/entities/fvg-zone.entity';
import {
  BACKTEST_RUN_REPOSITORY_TOKEN,
  type BacktestSignalEventView,
  type BacktestTradeView,
  type IBacktestRunRepository,
} from 'src/backtesting/domain/interfaces/backtest-run-repository.interface';
import {
  MARKET_DATA_REPOSITORY_TOKEN,
  type IMarketDataRepository,
} from 'src/backtesting/domain/interfaces/market-data-repository.interface';
import { Timeframe } from 'src/backtesting/domain/value-objects/timeframe.value-object';
import { Timestamp } from 'src/backtesting/domain/value-objects/timestamp.value-object';

type BacktestRunFvgZoneView = {
  id: string;
  direction: 'bullish' | 'bearish';
  lowerBound: string;
  upperBound: string;
  startTime: string;
  endTime: string | null;
  description: string;
};

type BacktestRunFvgZonesView = {
  items: BacktestRunFvgZoneView[];
  total: number;
};

@Injectable()
export class GetBacktestRunFvgZonesUseCase {
  private static readonly SIGNAL_PAGE_LIMIT = 1000;

  constructor(
    @Inject(BACKTEST_RUN_REPOSITORY_TOKEN)
    private readonly backtestRunRepository: IBacktestRunRepository,
    @Inject(MARKET_DATA_REPOSITORY_TOKEN)
    private readonly marketDataRepository: IMarketDataRepository,
  ) {}

  public async execute(runId: string): Promise<BacktestRunFvgZonesView | null> {
    const run = await this.backtestRunRepository.findById(runId);
    if (!run) {
      return null;
    }

    const signals = await this.loadAllSignals(runId);
    const intervals = this.resolveIntervals(run);
    const zones = await this.rebuildFvgZones(
      run.symbol,
      intervals.fromInterval,
      intervals.toInterval,
      Timestamp.fromMs(BigInt(run.startTime)),
      Timestamp.fromMs(BigInt(run.endTime)),
    );

    const signalsByZoneId = new Map<string, BacktestSignalEventView[]>();
    for (const signal of signals) {
      const zoneId = this.extractZoneId(signal);
      if (!zoneId) {
        continue;
      }
      const group = signalsByZoneId.get(zoneId) ?? [];
      group.push(signal);
      signalsByZoneId.set(zoneId, group);
    }

    const items = zones.map((zone) => {
      const zoneSignals = signalsByZoneId.get(zone.getId()) ?? [];
      const openedTrade = this.findOpenedTradeForZoneSignal(zoneSignals, run.trades);

      return {
        id: zone.getId(),
        direction: zone.getDirection(),
        lowerBound: zone.getLowerBound().toString(),
        upperBound: zone.getUpperBound().toString(),
        startTime: zone.getCreatedTime().toMs().toString(),
        endTime: zone.getMitigatedTime()?.toMs().toString() ?? null,
        description: this.buildZoneDescription(zone, zoneSignals, openedTrade),
      };
    });

    return {
      items,
      total: items.length,
    };
  }

  private async loadAllSignals(runId: string): Promise<BacktestSignalEventView[]> {
    const collected: BacktestSignalEventView[] = [];
    let cursorTs: bigint | undefined;
    let cursorId: string | undefined;

    while (true) {
      const page = await this.backtestRunRepository.findSignalsByRunId({
        runId,
        limit: GetBacktestRunFvgZonesUseCase.SIGNAL_PAGE_LIMIT,
        cursorTs,
        cursorId,
      });
      if (!page) {
        break;
      }

      collected.push(...page.items);
      if (!page.nextCursor) {
        break;
      }

      const parsed = page.nextCursor.split(':');
      if (parsed.length !== 2) {
        break;
      }
      cursorTs = BigInt(parsed[0]);
      cursorId = parsed[1];
    }

    return collected;
  }

  private async rebuildFvgZones(
    symbol: string,
    fromInterval: string,
    toInterval: string,
    start: Timestamp,
    end: Timestamp,
  ): Promise<FVGZone[]> {
    const history: Candle[] = [];
    const zones = new Map<string, FVGZone>();
    const stream = this.getHigherTimeframeStream(
      symbol,
      fromInterval,
      toInterval,
      start,
      end,
    );

    for await (const candle of stream) {
      history.push(candle);

      for (const zone of zones.values()) {
        if (!zone.isMitigated() && this.isMitigated(zone, candle)) {
          zone.markMitigated(candle.getClose(), candle.getCloseTime());
        }
      }

      if (history.length < 3) {
        continue;
      }

      const first = history[history.length - 3];
      const current = history[history.length - 1];
      const openTime = current.getOpenTime();

      if (first.getHigh().isLessThan(current.getLow())) {
        const id = `fvg-bull-${openTime.toMs().toString()}`;
        zones.set(
          id,
          FVGZone.createBullish(id, current.getLow(), first.getHigh(), openTime),
        );
      }

      if (first.getLow().isGreaterThan(current.getHigh())) {
        const id = `fvg-bear-${openTime.toMs().toString()}`;
        zones.set(
          id,
          FVGZone.createBearish(id, first.getLow(), current.getHigh(), openTime),
        );
      }
    }

    return Array.from(zones.values()).sort((a, b) => {
      const aTime = a.getCreatedTime().toMs();
      const bTime = b.getCreatedTime().toMs();
      if (aTime < bTime) {
        return -1;
      }
      if (aTime > bTime) {
        return 1;
      }
      return 0;
    });
  }

  private getHigherTimeframeStream(
    symbol: string,
    fromInterval: string,
    toInterval: string,
    start: Timestamp,
    end: Timestamp,
  ): AsyncIterable<Candle> {
    if (fromInterval === toInterval) {
      return this.marketDataRepository.getCandleStream(
        symbol,
        toInterval,
        start,
        end,
      );
    }

    return this.marketDataRepository.getAggregatedStream(
      symbol,
      Timeframe.from(fromInterval),
      Timeframe.from(toInterval),
      start,
      end,
    );
  }

  private resolveIntervals(run: {
    config?: Record<string, unknown> | null;
    interval: string;
  }): {
    fromInterval: string;
    toInterval: string;
  } {
    const config = run.config ?? {};
    const configFromInterval = config.fromInterval;
    const configToInterval = config.toInterval;

    const fromInterval =
      typeof configFromInterval === 'string' && configFromInterval.length > 0
        ? configFromInterval
        : run.interval;
    const toInterval =
      typeof configToInterval === 'string' && configToInterval.length > 0
        ? configToInterval
        : run.interval;

    return {
      fromInterval,
      toInterval,
    };
  }

  private isMitigated(zone: FVGZone, candle: Candle): boolean {
    return (
      candle.getLow().isLessThanOrEqual(zone.getUpperBound()) &&
      candle.getHigh().isGreaterThanOrEqual(zone.getLowerBound())
    );
  }

  private extractZoneId(signal: BacktestSignalEventView): string | null {
    const metadata = signal.metadata ?? {};
    const zoneId = metadata.reactedZoneId;
    return typeof zoneId === 'string' ? zoneId : null;
  }

  private findOpenedTradeForZoneSignal(
    signals: BacktestSignalEventView[],
    trades: BacktestTradeView[],
  ): BacktestTradeView | null {
    for (const signal of signals) {
      const side = signal.signalType;
      if (side !== 'BUY' && side !== 'SELL') {
        continue;
      }
      const matched = trades.find(
        (trade) => trade.entryTime === signal.timestamp && trade.side === side,
      );
      if (matched) {
        return matched;
      }
    }
    return null;
  }

  private buildZoneDescription(
    zone: FVGZone,
    zoneSignals: BacktestSignalEventView[],
    openedTrade: BacktestTradeView | null,
  ): string {
    if (openedTrade && zoneSignals.length > 0) {
      return `opened position because signal ${zoneSignals[0].reason} was executed`;
    }

    if (zoneSignals.length > 0) {
      return 'not opened position because signal was generated but trade was not executed';
    }

    if (zone.isMitigated()) {
      return 'not opened position because zone was mitigated before BOS confirmation';
    }

    return 'not opened position because no entry signal was generated';
  }
}
