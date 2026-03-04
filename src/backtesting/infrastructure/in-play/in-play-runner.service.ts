import Decimal from 'decimal.js';
import { Inject, Injectable } from '@nestjs/common';
import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import {
  IN_PLAY_RUN_REPOSITORY_TOKEN,
  type IInPlayRunRepository,
  type SaveInPlayRangeInput,
} from 'src/backtesting/domain/interfaces/in-play-run-repository.interface';
import {
  IN_PLAY_RUNNER_TOKEN,
  type IInPlayRunner,
} from 'src/backtesting/domain/interfaces/in-play-runner.interface';
import {
  MARKET_DATA_REPOSITORY_TOKEN,
  type IMarketDataRepository,
} from 'src/backtesting/domain/interfaces/market-data-repository.interface';
import { Timestamp } from 'src/backtesting/domain/value-objects/timestamp.value-object';
import { PrismaService } from 'src/core/infrastructure/prisma.service';
import { LOGGER_TOKEN, type ILogger } from 'src/core/interfaces/logger.interface';

type ActiveWindowPoint = {
  candle: Candle;
  quoteVolume: Decimal;
  high: Decimal;
  low: Decimal;
};

@Injectable()
export class InPlayRunnerService implements IInPlayRunner {
  private static readonly LOG_CONTEXT = 'InPlayRunnerService';
  private readonly queue: string[] = [];
  private readonly queued = new Set<string>();
  private readonly running = new Set<string>();

  constructor(
    @Inject(IN_PLAY_RUN_REPOSITORY_TOKEN)
    private readonly repository: IInPlayRunRepository,
    @Inject(MARKET_DATA_REPOSITORY_TOKEN)
    private readonly marketDataRepository: IMarketDataRepository,
    private readonly prisma: PrismaService,
    @Inject(LOGGER_TOKEN)
    private readonly logger: ILogger,
  ) {}

  public enqueue(runId: string): void {
    if (this.queued.has(runId) || this.running.has(runId)) {
      return;
    }
    this.queue.push(runId);
    this.queued.add(runId);
    this.schedule();
  }

  private schedule(): void {
    if (this.running.size > 0) {
      return;
    }
    const runId = this.queue.shift();
    if (!runId) {
      return;
    }
    this.queued.delete(runId);
    this.running.add(runId);
    void this.execute(runId).finally(() => {
      this.running.delete(runId);
      this.schedule();
    });
  }

  private async execute(runId: string): Promise<void> {
    const run = await this.repository.findRunById(runId);
    if (!run) {
      return;
    }

    try {
      await this.repository.markRunning(runId);
      const symbols = await this.resolveSymbols(run.symbols, run.interval);
      await this.repository.setTotalSymbols(runId, symbols.length);

      for (const symbol of symbols) {
        const ranges = await this.detectRangesForSymbol(
          symbol,
          run.interval,
          BigInt(run.startTime),
          BigInt(run.endTime),
          run.windowSize,
          new Decimal(run.quoteVolumeThreshold),
          new Decimal(run.volatilityThreshold),
        );
        await this.repository.addRanges(runId, ranges);
        await this.repository.incrementProcessedSymbols(runId);
      }

      await this.repository.markCompleted(runId);
      this.logger.log(
        `In-play run completed runId=${runId} symbols=${symbols.length}`,
        InPlayRunnerService.LOG_CONTEXT,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.repository.markFailed(runId, message);
      this.logger.error(
        `In-play run failed runId=${runId} reason=${message}`,
        undefined,
        InPlayRunnerService.LOG_CONTEXT,
      );
    }
  }

  private async resolveSymbols(
    symbols: string[] | null,
    interval: string,
  ): Promise<string[]> {
    if (symbols && symbols.length > 0) {
      return symbols;
    }
    const rows = await this.prisma.marketData.findMany({
      where: { interval },
      distinct: ['symbol'],
      select: { symbol: true },
      orderBy: { symbol: 'asc' },
    });
    return rows.map((row) => row.symbol);
  }

  private async detectRangesForSymbol(
    symbol: string,
    interval: string,
    startTimeMs: bigint,
    endTimeMs: bigint,
    windowSize: number,
    quoteVolumeThreshold: Decimal,
    volatilityThresholdPercent: Decimal,
  ): Promise<SaveInPlayRangeInput[]> {
    const queue: ActiveWindowPoint[] = [];
    const ranges: SaveInPlayRangeInput[] = [];

    let currentRange: {
      startTime: bigint;
      endTime: bigint;
      low: Decimal;
      high: Decimal;
      activeWindows: number;
      sumQuoteVolume: Decimal;
      maxVolatilityPercent: Decimal;
    } | null = null;

    for await (const candle of this.marketDataRepository.getCandleStream(
      symbol,
      interval,
      Timestamp.fromMs(startTimeMs),
      Timestamp.fromMs(endTimeMs),
    )) {
      const point: ActiveWindowPoint = {
        candle,
        quoteVolume: candle.getOHLCV().getQuoteAssetVolume(),
        high: candle.getHigh().toDecimal(),
        low: candle.getLow().toDecimal(),
      };
      queue.push(point);
      if (queue.length > windowSize) {
        queue.shift();
      }
      if (queue.length < windowSize) {
        continue;
      }

      let windowQuoteVolume = new Decimal(0);
      let windowHigh = queue[0].high;
      let windowLow = queue[0].low;
      for (const entry of queue) {
        windowQuoteVolume = windowQuoteVolume.plus(entry.quoteVolume);
        if (entry.high.greaterThan(windowHigh)) {
          windowHigh = entry.high;
        }
        if (entry.low.lessThan(windowLow)) {
          windowLow = entry.low;
        }
      }
      const denominator = Decimal.max(windowLow, new Decimal('0.00000001'));
      const volatilityPercent = windowHigh
        .minus(windowLow)
        .dividedBy(denominator)
        .times(100);

      const isActive =
        windowQuoteVolume.greaterThanOrEqualTo(quoteVolumeThreshold) &&
        volatilityPercent.greaterThanOrEqualTo(volatilityThresholdPercent);

      if (!isActive) {
        if (currentRange) {
          ranges.push({
            symbol,
            interval,
            startTime: currentRange.startTime,
            endTime: currentRange.endTime,
            lowPrice: currentRange.low.toString(),
            highPrice: currentRange.high.toString(),
            activeWindows: currentRange.activeWindows,
            avgQuoteVolume: currentRange.sumQuoteVolume
              .dividedBy(currentRange.activeWindows)
              .toFixed(8),
            maxVolatilityPercent: currentRange.maxVolatilityPercent.toFixed(8),
          });
          currentRange = null;
        }
        continue;
      }

      const windowStartTime = queue[0].candle.getOpenTime().toMs();
      const windowEndTime = queue[queue.length - 1].candle.getCloseTime().toMs();
      const candleLow = queue[queue.length - 1].candle.getLow().toDecimal();
      const candleHigh = queue[queue.length - 1].candle.getHigh().toDecimal();

      if (!currentRange) {
        currentRange = {
          startTime: windowStartTime,
          endTime: windowEndTime,
          low: candleLow,
          high: candleHigh,
          activeWindows: 1,
          sumQuoteVolume: windowQuoteVolume,
          maxVolatilityPercent: volatilityPercent,
        };
        continue;
      }

      currentRange.endTime = windowEndTime;
      currentRange.activeWindows += 1;
      currentRange.sumQuoteVolume = currentRange.sumQuoteVolume.plus(
        windowQuoteVolume,
      );
      if (candleLow.lessThan(currentRange.low)) {
        currentRange.low = candleLow;
      }
      if (candleHigh.greaterThan(currentRange.high)) {
        currentRange.high = candleHigh;
      }
      if (volatilityPercent.greaterThan(currentRange.maxVolatilityPercent)) {
        currentRange.maxVolatilityPercent = volatilityPercent;
      }
    }

    if (currentRange) {
      ranges.push({
        symbol,
        interval,
        startTime: currentRange.startTime,
        endTime: currentRange.endTime,
        lowPrice: currentRange.low.toString(),
        highPrice: currentRange.high.toString(),
        activeWindows: currentRange.activeWindows,
        avgQuoteVolume: currentRange.sumQuoteVolume
          .dividedBy(currentRange.activeWindows)
          .toFixed(8),
        maxVolatilityPercent: currentRange.maxVolatilityPercent.toFixed(8),
      });
    }

    return ranges;
  }
}

export const IN_PLAY_RUNNER_SERVICE_PROVIDER = {
  provide: IN_PLAY_RUNNER_TOKEN,
  useClass: InPlayRunnerService,
};
