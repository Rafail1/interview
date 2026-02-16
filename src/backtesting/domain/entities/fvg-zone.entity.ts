import Decimal from 'decimal.js';
import { Price, Timestamp } from '../value-objects';

/**
 * Fair Value Gap (FVG) zone.
 * Stateful entity that tracks mitigation status.
 */
export class FVGZone {
  private mitigated: boolean = false;
  private mitigatedPrice: Price | null = null;
  private mitigatedTime: Timestamp | null = null;

  private constructor(
    private readonly id: string,
    private readonly direction: 'bullish' | 'bearish',
    private readonly upperBound: Price,
    private readonly lowerBound: Price,
    private readonly createdTime: Timestamp,
  ) {
    if (upperBound.isLessThan(lowerBound)) {
      throw new Error('FVGZone: upperBound must be >= lowerBound');
    }
  }

  /**
   * Factory: create bullish FVG (price gap above candle)
   */
  public static createBullish(
    id: string,
    high: Price,
    low: Price,
    createdTime: Timestamp,
  ): FVGZone {
    return new FVGZone(id, 'bullish', high, low, createdTime);
  }

  /**
   * Factory: create bearish FVG (price gap below candle)
   */
  public static createBearish(
    id: string,
    high: Price,
    low: Price,
    createdTime: Timestamp,
  ): FVGZone {
    return new FVGZone(id, 'bearish', high, low, createdTime);
  }

  /**
   * Getters
   */
  public getId(): string {
    return this.id;
  }

  public getDirection(): 'bullish' | 'bearish' {
    return this.direction;
  }

  public isBullish(): boolean {
    return this.direction === 'bullish';
  }

  public isBearish(): boolean {
    return this.direction === 'bearish';
  }

  public getUpperBound(): Price {
    return this.upperBound;
  }

  public getLowerBound(): Price {
    return this.lowerBound;
  }

  public getCreatedTime(): Timestamp {
    return this.createdTime;
  }

  public isMitigated(): boolean {
    return this.mitigated;
  }

  public getMitigatedPrice(): Price | null {
    return this.mitigatedPrice;
  }

  public getMitigatedTime(): Timestamp | null {
    return this.mitigatedTime;
  }

  /**
   * Check if price is within FVG zone
   */
  public containsPrice(price: Price): boolean {
    return (
      price.isGreaterThanOrEqual(this.lowerBound) &&
      price.isLessThanOrEqual(this.upperBound)
    );
  }

  /**
   * Size of the FVG zone
   */
  public getSize(): Price {
    return this.upperBound.subtract(this.lowerBound);
  }

  /**
   * Size as percentage of lowerBound
   */
  public getSizePercent(): Decimal {
    if (this.lowerBound.equals(Price.zero())) {
      return new Decimal(0);
    }
    return this.getSize()
      .toDecimal()
      .dividedBy(this.lowerBound.toDecimal())
      .times(100);
  }

  /**
   * Check and mark mitigation (price crosses through FVG)
   */
  public checkMitigation(price: Price, currentTime: Timestamp): void {
    if (this.mitigated) {
      return; // Already mitigated, ignore
    }

    if (this.containsPrice(price)) {
      this.mitigated = true;
      this.mitigatedPrice = price;
      this.mitigatedTime = currentTime;
    }
  }

  /**
   * Explicitly mark as mitigated
   */
  public markMitigated(price: Price, currentTime: Timestamp): void {
    this.mitigated = true;
    this.mitigatedPrice = price;
    this.mitigatedTime = currentTime;
  }

  /**
   * Serialization
   */
  public toJSON() {
    return {
      id: this.id,
      direction: this.direction,
      upperBound: this.upperBound.toString(),
      lowerBound: this.lowerBound.toString(),
      createdTime: this.createdTime.toMsNumber(),
      mitigated: this.mitigated,
      mitigatedPrice: this.mitigatedPrice?.toString() ?? null,
      mitigatedTime: this.mitigatedTime?.toMsNumber() ?? null,
    };
  }
}
