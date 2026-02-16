import Decimal from 'decimal.js';
import { Price } from './price.value-object';

/**
 * Immutable value object for OHLCV (Open, High, Low, Close, Volume).
 * Represents a complete candlestick's price and volume data.
 */
export class OHLCV {
  private constructor(
    private readonly open: Price,
    private readonly high: Price,
    private readonly low: Price,
    private readonly close: Price,
    private readonly volume: Decimal,
    private readonly quoteAssetVolume: Decimal,
  ) {
    // Validate: H >= O,C and L <= O,C
    if (high.isLessThan(open) || high.isLessThan(close)) {
      throw new Error('High must be >= open and close');
    }
    if (low.isGreaterThan(open) || low.isGreaterThan(close)) {
      throw new Error('Low must be <= open and close');
    }
    if (high.isLessThan(low)) {
      throw new Error('High must be >= low');
    }
    if (volume.isNegative()) {
      throw new Error('Volume must be non-negative');
    }
  }

  /**
   * Factory: create from raw values
   */
  public static from(
    open: string | number,
    high: string | number,
    low: string | number,
    close: string | number,
    volume: string | number,
    quoteAssetVolume: string | number = 0,
  ): OHLCV {
    return new OHLCV(
      Price.from(open),
      Price.from(high),
      Price.from(low),
      Price.from(close),
      new Decimal(volume),
      new Decimal(quoteAssetVolume),
    );
  }

  /**
   * Getters
   */
  public getOpen(): Price {
    return this.open;
  }

  public getHigh(): Price {
    return this.high;
  }

  public getLow(): Price {
    return this.low;
  }

  public getClose(): Price {
    return this.close;
  }

  public getVolume(): Decimal {
    return this.volume;
  }

  public getQuoteAssetVolume(): Decimal {
    return this.quoteAssetVolume;
  }

  /**
   * Check if price is within candle range (including boundaries)
   */
  public containsPrice(price: Price): boolean {
    return (
      price.isGreaterThanOrEqual(this.low) && price.isLessThanOrEqual(this.high)
    );
  }

  /**
   * Candle direction
   */
  public isGreen(): boolean {
    return this.close.isGreaterThanOrEqual(this.open);
  }

  public isRed(): boolean {
    return this.close.isLessThan(this.open);
  }

  /**
   * Body and wick sizes
   */
  public getBodySize(): Price {
    return this.close.subtract(this.open);
  }

  public getWickSize(): Price {
    return this.high.subtract(this.low);
  }

  /**
   * Range: high - low
   */
  public getRange(): Price {
    return this.high.subtract(this.low);
  }

  /**
   * Size as percentage of close
   */
  public getRangeSizePercent(): Decimal {
    if (this.close.equals(Price.zero())) {
      throw new Error('Cannot calculate range size percent with zero close');
    }
    return this.getRange()
      .toDecimal()
      .dividedBy(this.close.toDecimal())
      .times(100);
  }

  /**
   * Serialization for storage
   */
  public toJSON() {
    return {
      open: this.open.toString(),
      high: this.high.toString(),
      low: this.low.toString(),
      close: this.close.toString(),
      volume: this.volume.toString(),
      quoteAssetVolume: this.quoteAssetVolume.toString(),
    };
  }
}
