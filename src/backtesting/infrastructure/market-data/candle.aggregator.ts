import Decimal from 'decimal.js';
import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import { OHLCV } from 'src/backtesting/domain/value-objects/ohlcv.value-object';
import { Timeframe } from 'src/backtesting/domain/value-objects/timeframe.value-object';

export class CandleAggregator {
  public static aggregate(
    candles: Candle[],
    fromTimeframe: Timeframe,
    toTimeframe: Timeframe,
  ): Candle[] {
    if (toTimeframe.isSmaller(fromTimeframe)) {
      throw new Error(
        `Cannot aggregate to smaller timeframe: ${toTimeframe.toString()} < ${fromTimeframe.toString()}`,
      );
    }

    if (fromTimeframe.equals(toTimeframe)) {
      return candles;
    }

    const factor = toTimeframe.aggregationFactor(fromTimeframe);
    const output: Candle[] = [];

    for (let i = 0; i + factor <= candles.length; i += factor) {
      output.push(this.mergeCandles(candles.slice(i, i + factor), toTimeframe));
    }

    return output;
  }

  public static async *aggregateStream(
    candleStream: AsyncIterable<Candle>,
    fromTimeframe: Timeframe,
    toTimeframe: Timeframe,
  ): AsyncGenerator<Candle> {
    if (toTimeframe.isSmaller(fromTimeframe)) {
      throw new Error(
        `Cannot aggregate to smaller timeframe: ${toTimeframe.toString()} < ${fromTimeframe.toString()}`,
      );
    }

    if (fromTimeframe.equals(toTimeframe)) {
      yield* candleStream;
      return;
    }

    const factor = toTimeframe.aggregationFactor(fromTimeframe);
    const buffer: Candle[] = [];

    for await (const candle of candleStream) {
      buffer.push(candle);
      if (buffer.length === factor) {
        yield this.mergeCandles(buffer, toTimeframe);
        buffer.length = 0;
      }
    }
  }

  private static mergeCandles(
    candles: Candle[],
    toTimeframe: Timeframe,
  ): Candle {
    const first = candles[0];
    const last = candles[candles.length - 1];

    const high = candles.reduce(
      (max, candle) =>
        candle.getHigh().isGreaterThan(max) ? candle.getHigh() : max,
      candles[0].getHigh(),
    );

    const low = candles.reduce(
      (min, candle) =>
        candle.getLow().isLessThan(min) ? candle.getLow() : min,
      candles[0].getLow(),
    );

    const volume = candles.reduce(
      (sum, candle) => sum.plus(candle.getVolume()),
      new Decimal(0),
    );
    const quoteVolume = candles.reduce(
      (sum, candle) => sum.plus(candle.getOHLCV().getQuoteAssetVolume()),
      new Decimal(0),
    );

    return Candle.create(
      first.getSymbol(),
      toTimeframe,
      first.getOpenTime().toMs(),
      last.getCloseTime().toMs(),
      OHLCV.from(
        first.getOpen().toString(),
        high.toString(),
        low.toString(),
        last.getClose().toString(),
        volume.toString(),
        quoteVolume.toString(),
      ),
    );
  }
}
