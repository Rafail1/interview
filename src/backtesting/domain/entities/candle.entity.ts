import { OHLCV, Price, Timestamp, Timeframe } from '../value-objects';

/**
 * Domain entity: Candle (candlestick/OHLC bar)
 * Represents a single time-period's market data with immutable OHLCV.
 */
export class Candle {
  private constructor(
    private readonly symbol: string,
    private readonly timeframe: Timeframe,
    private readonly openTime: Timestamp,
    private readonly closeTime: Timestamp,
    private readonly ohlcv: OHLCV,
  ) {}

  /**
   * Factory: create new candle
   */
  public static create(
    symbol: string,
    timeframe: Timeframe,
    openTimeMs: number | bigint,
    closeTimeMs: number | bigint,
    ohlcv: OHLCV,
  ): Candle {
    return new Candle(
      symbol,
      timeframe,
      Timestamp.fromMs(openTimeMs),
      Timestamp.fromMs(closeTimeMs),
      ohlcv,
    );
  }

  /**
   * Factory: from Binance CSV row (fast path)
   * CSV: [openTime, open, high, low, close, volume, closeTime, quoteAssetVolume, numberOfTrades, ...]
   */
  public static fromBinanceRow(
    symbol: string,
    timeframe: string,
    row: string[],
  ): Candle {
    if (row.length < 8) {
      throw new Error('Invalid Binance kline row: insufficient columns');
    }

    const openTimeMs = Number(row[0]);
    const open = row[1];
    const high = row[2];
    const low = row[3];
    const close = row[4];
    const volume = row[5];
    const closeTimeMs = Number(row[6]);
    const quoteAssetVolume = row[7];

    return Candle.create(
      symbol,
      Timeframe.from(timeframe),
      openTimeMs,
      closeTimeMs,
      OHLCV.from(open, high, low, close, volume, quoteAssetVolume),
    );
  }

  /**
   * Getters
   */
  public getSymbol(): string {
    return this.symbol;
  }

  public getTimeframe(): Timeframe {
    return this.timeframe;
  }

  public getOpenTime(): Timestamp {
    return this.openTime;
  }

  public getCloseTime(): Timestamp {
    return this.closeTime;
  }

  public getOHLCV(): OHLCV {
    return this.ohlcv;
  }

  public getOpen(): Price {
    return this.ohlcv.getOpen();
  }

  public getHigh(): Price {
    return this.ohlcv.getHigh();
  }

  public getLow(): Price {
    return this.ohlcv.getLow();
  }

  public getClose(): Price {
    return this.ohlcv.getClose();
  }

  public getVolume() {
    return this.ohlcv.getVolume();
  }

  /**
   * Check if price occurred within this candle
   */
  public priceOccurred(price: Price): boolean {
    return this.ohlcv.containsPrice(price);
  }

  /**
   * Is this candle green (bullish)?
   */
  public isBullish(): boolean {
    return this.ohlcv.isGreen();
  }

  /**
   * Is this candle red (bearish)?
   */
  public isBearish(): boolean {
    return this.ohlcv.isRed();
  }

  /**
   * Serialization
   */
  public toJSON() {
    return {
      symbol: this.symbol,
      timeframe: this.timeframe.toString(),
      openTime: this.openTime.toMsNumber(),
      closeTime: this.closeTime.toMsNumber(),
      ohlcv: this.ohlcv.toJSON(),
    };
  }
}
