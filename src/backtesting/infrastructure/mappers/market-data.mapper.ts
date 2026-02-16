import { Injectable } from '@nestjs/common';
import type { MarketData, Prisma } from '@prisma/client';
import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import { OHLCV } from 'src/backtesting/domain/value-objects/ohlcv.value-object';
import { Timeframe } from 'src/backtesting/domain/value-objects/timeframe.value-object';

@Injectable()
export class MarketDataMapper {
  public toDomain(record: MarketData): Candle {
    return Candle.create(
      record.symbol,
      Timeframe.from(record.interval),
      record.openTime,
      record.closeTime,
      OHLCV.from(
        record.open,
        record.high,
        record.low,
        record.close,
        record.volume,
        record.quoteAssetVolume,
      ),
    );
  }

  public toPersistence(
    candle: Candle,
  ): Omit<Prisma.MarketDataUncheckedCreateInput, 'id' | 'createdAt'> {
    const ohlcv = candle.getOHLCV();
    return {
      symbol: candle.getSymbol(),
      interval: candle.getTimeframe().toString(),
      openTime: candle.getOpenTime().toMs(),
      closeTime: candle.getCloseTime().toMs(),
      open: ohlcv.getOpen().toString(),
      high: ohlcv.getHigh().toString(),
      low: ohlcv.getLow().toString(),
      close: ohlcv.getClose().toString(),
      volume: ohlcv.getVolume().toString(),
      quoteAssetVolume: ohlcv.getQuoteAssetVolume().toString(),
      numberOfTrades: 0,
      takerBuyBaseVolume: '0',
      takerBuyQuoteVolume: '0',
    };
  }
}
