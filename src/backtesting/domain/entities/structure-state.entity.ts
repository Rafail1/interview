import { Price, Timestamp } from '../value-objects';

/**
 * Internal structure state entity.
 * Tracks swing highs/lows and detects Break of Structure (BOS).
 */
export class StructureState {
  private swingHigh: Price;
  private swingHighTime: Timestamp;
  private swingLow: Price;
  private swingLowTime: Timestamp;
  private bosDetected: boolean = false;
  private bosTime: Timestamp | null = null;
  private bosType: 'bullish' | 'bearish' | null = null;

  private constructor(
    private readonly id: string,
    swingHigh: Price,
    swingHighTime: Timestamp,
    swingLow: Price,
    swingLowTime: Timestamp,
  ) {
    this.swingHigh = swingHigh;
    this.swingHighTime = swingHighTime;
    this.swingLow = swingLow;
    this.swingLowTime = swingLowTime;
  }

  /**
   * Factory: create initial structure from price
   */
  public static create(
    id: string,
    price: Price,
    time: Timestamp,
  ): StructureState {
    return new StructureState(id, price, time, price, time);
  }

  /**
   * Getters
   */
  public getId(): string {
    return this.id;
  }

  public getSwingHigh(): Price {
    return this.swingHigh;
  }

  public getSwingHighTime(): Timestamp {
    return this.swingHighTime;
  }

  public getSwingLow(): Price {
    return this.swingLow;
  }

  public getSwingLowTime(): Timestamp {
    return this.swingLowTime;
  }

  public isBoSDetected(): boolean {
    return this.bosDetected;
  }

  public getBoSType(): 'bullish' | 'bearish' | null {
    return this.bosType;
  }

  public getBoSTime(): Timestamp | null {
    return this.bosTime;
  }

  public clearBos(): void {
    this.bosDetected = false;
    this.bosTime = null;
    this.bosType = null;
  }

  /**
   * Update structure with new price
   * Returns true if BOS detected
   */
  public updateStructure(price: Price, time: Timestamp): boolean {
    // Update swing high
    if (price.isGreaterThan(this.swingHigh)) {
      this.swingHigh = price;
      this.swingHighTime = time;
    }

    // Update swing low
    if (price.isLessThan(this.swingLow)) {
      this.swingLow = price;
      this.swingLowTime = time;
    }

    return this.bosDetected;
  }

  /**
   * Check for bullish BOS: price breaks above previous swing high
   */
  public checkBullishBos(price: Price, time: Timestamp): boolean {
    if (this.bosDetected || price.isLessThanOrEqual(this.swingHigh)) {
      return false;
    }

    this.bosDetected = true;
    this.bosType = 'bullish';
    this.bosTime = time;
    return true;
  }

  /**
   * Check for bearish BOS: price breaks below previous swing low
   */
  public checkBearishBos(price: Price, time: Timestamp): boolean {
    if (this.bosDetected || price.isGreaterThanOrEqual(this.swingLow)) {
      return false;
    }

    this.bosDetected = true;
    this.bosType = 'bearish';
    this.bosTime = time;
    return true;
  }

  /**
   * Reset structure for new analysis
   */
  public reset(price: Price, time: Timestamp): void {
    this.swingHigh = price;
    this.swingHighTime = time;
    this.swingLow = price;
    this.swingLowTime = time;
    this.bosDetected = false;
    this.bosTime = null;
    this.bosType = null;
  }

  /**
   * Serialization
   */
  public toJSON() {
    return {
      id: this.id,
      swingHigh: this.swingHigh.toString(),
      swingHighTime: this.swingHighTime.toMsNumber(),
      swingLow: this.swingLow.toString(),
      swingLowTime: this.swingLowTime.toMsNumber(),
      bosDetected: this.bosDetected,
      bosType: this.bosType,
      bosTime: this.bosTime?.toMsNumber() ?? null,
    };
  }
}
