import { Injectable } from '@nestjs/common';
import { Prisma, type MarketData } from '@prisma/client';
import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import { IMarketDataRepository } from 'src/backtesting/domain/interfaces/market-data-repository.interface';
import { Timeframe } from 'src/backtesting/domain/value-objects/timeframe.value-object';
import { Timestamp } from 'src/backtesting/domain/value-objects/timestamp.value-object';
import { PrismaService } from 'src/core/infrastructure/prisma.service';
import { CandleAggregator } from '../market-data/candle.aggregator';
import { TimeframeCacheService } from '../market-data/timeframe-cache.service';
import { MarketDataMapper } from '../mappers/market-data.mapper';

@Injectable()
export class MarketDataRepository implements IMarketDataRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: TimeframeCacheService,
    private readonly marketDataMapper: MarketDataMapper,
  ) {}

  public async *getCandleStream(
    symbol: string,
    interval: string,
    startTime: Timestamp,
    endTime: Timestamp,
  ): AsyncIterable<Candle> {
    const batchSize = 1_000;
    let cursorOpenTime: bigint | null = null;

    while (true) {
      const records = await this.findBatch(
        symbol,
        interval,
        startTime.toMs(),
        endTime.toMs(),
        cursorOpenTime,
        batchSize,
      );

      if (records.length === 0) {
        break;
      }

      for (const record of records) {
        yield this.marketDataMapper.toDomain(record);
      }

      cursorOpenTime = records[records.length - 1].openTime;

      if (records.length < batchSize) {
        break;
      }
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
        const openTime = candle.getOpenTime().toMs();
        if (openTime >= startTime.toMs() && openTime <= endTime.toMs()) {
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

  public async saveCandles(candles: Candle[]): Promise<void> {
    if (candles.length === 0) {
      return;
    }

    const batchSize = 500;
    for (let start = 0; start < candles.length; start += batchSize) {
      const batch = candles.slice(start, start + batchSize);
      await this.prisma.$transaction(
        batch.map((candle) => {
          const data = this.marketDataMapper.toPersistence(candle);
          return this.prisma.marketData.upsert({
            where: {
              symbol_interval_openTime: {
                symbol: data.symbol,
                interval: data.interval,
                openTime: data.openTime,
              },
            },
            create: data,
            update: data,
          });
        }),
      );
    }
  }

  public async hasData(
    symbol: string,
    interval: string,
    startTime: Timestamp,
    endTime: Timestamp,
  ): Promise<boolean> {
    const count = await this.prisma.marketData.count({
      where: {
        symbol,
        interval,
        openTime: {
          gte: startTime.toMs(),
          lte: endTime.toMs(),
        },
      },
      take: 1,
    });

    return count > 0;
  }

  private async findBatch(
    symbol: string,
    interval: string,
    startOpenTimeMs: bigint,
    endOpenTimeMs: bigint,
    cursorOpenTime: bigint | null,
    batchSize: number,
  ): Promise<MarketData[]> {
    const cursorClause =
      cursorOpenTime === null
        ? Prisma.empty
        : Prisma.sql`AND "openTime" > ${cursorOpenTime}`;

    return this.prisma.$queryRaw<MarketData[]>(Prisma.sql`
      SELECT
        id,
        symbol,
        interval,
        "openTime",
        "closeTime",
        open,
        high,
        low,
        close,
        volume,
        "quoteAssetVolume",
        "numberOfTrades",
        "takerBuyBaseVolume",
        "takerBuyQuoteVolume",
        "createdAt"
      FROM "market_data"
      WHERE symbol = ${symbol}
        AND interval = ${interval}
        AND "openTime" >= ${startOpenTimeMs}
        AND "openTime" <= ${endOpenTimeMs}
        ${cursorClause}
      ORDER BY "openTime" ASC
      LIMIT ${batchSize}
    `);
  }
}
