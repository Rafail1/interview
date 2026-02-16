/**
 * Immutable value object for candlestick timeframe.
 * Supports standard crypto intervals.
 */
export type TimeframeValue =
  | '1m'
  | '3m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '2h'
  | '4h'
  | '6h'
  | '8h'
  | '12h'
  | '1d'
  | '3d'
  | '1w'
  | '1mo';

export class Timeframe {
  private constructor(private readonly value: TimeframeValue) {}

  /**
   * Factory: create from string
   */
  public static from(value: string): Timeframe {
    const valid: TimeframeValue[] = [
      '1m',
      '3m',
      '5m',
      '15m',
      '30m',
      '1h',
      '2h',
      '4h',
      '6h',
      '8h',
      '12h',
      '1d',
      '3d',
      '1w',
      '1mo',
    ];
    if (!valid.includes(value as TimeframeValue)) {
      throw new Error(`Invalid timeframe: ${value}`);
    }
    return new Timeframe(value as TimeframeValue);
  }

  /**
   * Preset factories
   */
  public static oneMinute(): Timeframe {
    return new Timeframe('1m');
  }

  public static fiveMinutes(): Timeframe {
    return new Timeframe('5m');
  }

  public static fifteenMinutes(): Timeframe {
    return new Timeframe('15m');
  }

  public static oneHour(): Timeframe {
    return new Timeframe('1h');
  }

  public static fourHours(): Timeframe {
    return new Timeframe('4h');
  }

  public static oneDay(): Timeframe {
    return new Timeframe('1d');
  }

  /**
   * Get string value
   */
  public toString(): string {
    return this.value;
  }

  /**
   * Convert to milliseconds
   */
  public toMs(): number {
    const multipliers: Record<TimeframeValue, number> = {
      '1m': 60_000,
      '3m': 180_000,
      '5m': 300_000,
      '15m': 900_000,
      '30m': 1_800_000,
      '1h': 3_600_000,
      '2h': 7_200_000,
      '4h': 14_400_000,
      '6h': 21_600_000,
      '8h': 28_800_000,
      '12h': 43_200_000,
      '1d': 86_400_000,
      '3d': 259_200_000,
      '1w': 604_800_000,
      '1mo': 2_592_000_000, // 30 days
    };
    return multipliers[this.value];
  }

  /**
   * Get number of minutes
   */
  public toMinutes(): number {
    return this.toMs() / 60_000;
  }

  /**
   * Equality
   */
  public equals(other: Timeframe): boolean {
    return this.value === other.value;
  }

  /**
   * Is smaller/larger than another timeframe
   */
  public isSmaller(other: Timeframe): boolean {
    return this.toMs() < other.toMs();
  }

  public isLarger(other: Timeframe): boolean {
    return this.toMs() > other.toMs();
  }

  /**
   * Calculate aggregation factor (e.g., 1m → 15m requires 15 candles)
   */
  public aggregationFactor(from: Timeframe): number {
    if (from.toMs() > this.toMs()) {
      throw new Error(
        `Cannot aggregate ${from.toString()} to smaller ${this.toString()}`,
      );
    }
    const factor = this.toMs() / from.toMs();
    if (!Number.isInteger(factor)) {
      throw new Error(
        `Cannot evenly aggregate ${from.toString()} to ${this.toString()}`,
      );
    }
    return factor;
  }
}
