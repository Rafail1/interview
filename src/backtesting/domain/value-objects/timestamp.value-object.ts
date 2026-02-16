/**
 * Immutable value object for Unix timestamp in milliseconds.
 */
export class Timestamp {
  private constructor(private readonly ms: bigint) {
    if (ms < 0n) {
      throw new Error('Timestamp must be positive');
    }
  }

  /**
   * Factory: from milliseconds (BigInt)
   */
  public static fromMs(ms: number | bigint): Timestamp {
    return new Timestamp(typeof ms === 'number' ? BigInt(ms) : ms);
  }

  /**
   * Factory: from seconds
   */
  public static fromSeconds(seconds: number): Timestamp {
    return new Timestamp(BigInt(Math.floor(seconds * 1000)));
  }

  /**
   * Factory: now
   */
  public static now(): Timestamp {
    return new Timestamp(BigInt(Date.now()));
  }

  /**
   * Get as BigInt (ms)
   */
  public toMs(): bigint {
    return this.ms;
  }

  /**
   * Get as number (ms) — use only if guaranteed to fit in number range
   */
  public toMsNumber(): number {
    return Number(this.ms);
  }

  /**
   * Get as seconds (rounded down)
   */
  public toSeconds(): number {
    return Math.floor(Number(this.ms) / 1000);
  }

  /**
   * ISO 8601 string
   */
  public toISOString(): string {
    return new Date(Number(this.ms)).toISOString();
  }

  /**
   * Format for display (e.g., "2024-01-15 14:30:45")
   */
  public toDateTimeString(): string {
    return new Date(Number(this.ms)).toLocaleString();
  }

  /**
   * Comparisons
   */
  public isBefore(other: Timestamp): boolean {
    return this.ms < other.ms;
  }

  public isBeforeOrEqual(other: Timestamp): boolean {
    return this.ms <= other.ms;
  }

  public isAfter(other: Timestamp): boolean {
    return this.ms > other.ms;
  }

  public isAfterOrEqual(other: Timestamp): boolean {
    return this.ms >= other.ms;
  }

  public equals(other: Timestamp): boolean {
    return this.ms === other.ms;
  }

  /**
   * Duration between timestamps (in ms)
   */
  public diffMs(other: Timestamp): bigint {
    return this.ms - other.ms;
  }

  /**
   * Add milliseconds
   */
  public addMs(ms: number | bigint): Timestamp {
    const add = typeof ms === 'number' ? BigInt(ms) : ms;
    return new Timestamp(this.ms + add);
  }

  /**
   * Subtract milliseconds
   */
  public subtractMs(ms: number | bigint): Timestamp {
    const sub = typeof ms === 'number' ? BigInt(ms) : ms;
    const result = this.ms - sub;
    if (result < 0n) {
      throw new Error('Resulting timestamp would be negative');
    }
    return new Timestamp(result);
  }
}
