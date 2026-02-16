import { Injectable } from '@nestjs/common';
import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import { IMarketDataRepository } from 'src/backtesting/domain/interfaces/market-data-repository.interface';
import { Timeframe } from 'src/backtesting/domain/value-objects/timeframe.value-object';
import { Timestamp } from 'src/backtesting/domain/value-objects/timestamp.value-object';
import { PrismaService } from 'src/core/infrastructure/prisma.service';
import { CandleAggregator } from '../market-data/candle.aggregator';
import { TimeframeCacheService } from '../market-data/timeframe-cache.service';

@Injectable()
export class MarketDataRepository implements IMarketDataRepository {
  private readonly storage: Candle[] = [];

  constructor(
    _prisma: PrismaService,
    private readonly cache: TimeframeCacheService,
  ) {
    void _prisma;
  }

  public async *getCandleStream(
    symbol: string,
    interval: string,
    startTime: Timestamp,
    endTime: Timestamp,
  ): AsyncIterable<Candle> {
    await Promise.resolve();
    const fromMs = startTime.toMs();
    const toMs = endTime.toMs();

    const candles = this.storage
      .filter(
        (candle) =>
          candle.getSymbol() === symbol &&
          candle.getTimeframe().toString() === interval &&
          candle.getOpenTime().toMs() >= fromMs &&
          candle.getOpenTime().toMs() <= toMs,
      )
      .sort((a, b) => Number(a.getOpenTime().toMs() - b.getOpenTime().toMs()));

    for (const candle of candles) {
      yield candle;
    }
  }

  public async *getAggregatedStream(
    symbol: string,
    fromInterval: Timeframe,
    toInterval: Timeframe,
    startTime: Timestamp,
    endTime: Timestamp,
  ): AsyncIterable<Candle> {
    if (fromInterval.equals(toInterval)) {
      yield* this.getCandleStream(
        symbol,
        fromInterval.toString(),
        startTime,
        endTime,
      );
      return;
    }

    if (toInterval.isSmaller(fromInterval)) {
      throw new Error(
        `Cannot aggregate ${fromInterval.toString()} to smaller ${toInterval.toString()}`,
      );
    }

    const cached = this.cache.getAggregated(symbol, toInterval);
    if (cached) {
      for (const candle of cached) {
        if (
          candle.getOpenTime().toMs() >= startTime.toMs() &&
          candle.getOpenTime().toMs() <= endTime.toMs()
        ) {
          yield candle;
        }
      }
      return;
    }

    const sourceCandles: Candle[] = [];
    for await (const candle of this.getCandleStream(
      symbol,
      fromInterval.toString(),
      startTime,
      endTime,
    )) {
      sourceCandles.push(candle);
    }

    if (fromInterval.toString() === '1m') {
      this.cache.cache1mCandles(symbol, sourceCandles);
    }

    const aggregated = CandleAggregator.aggregate(
      sourceCandles,
      fromInterval,
      toInterval,
    );

    for (const candle of aggregated) {
      yield candle;
    }
  }

  public saveCandles(candles: Candle[]): Promise<void> {
    for (const candle of candles) {
      const exists = this.storage.some(
        (existing) =>
          existing.getSymbol() === candle.getSymbol() &&
          existing.getTimeframe().equals(candle.getTimeframe()) &&
          existing.getOpenTime().equals(candle.getOpenTime()),
      );
      if (!exists) {
        this.storage.push(candle);
      }
    }
    return Promise.resolve();
  }

  public hasData(
    symbol: string,
    interval: string,
    startTime: Timestamp,
    endTime: Timestamp,
  ): Promise<boolean> {
    const exists = this.storage.some(
      (candle) =>
        candle.getSymbol() === symbol &&
        candle.getTimeframe().toString() === interval &&
        candle.getOpenTime().toMs() >= startTime.toMs() &&
        candle.getOpenTime().toMs() <= endTime.toMs(),
    );
    return Promise.resolve(exists);
  }
}
