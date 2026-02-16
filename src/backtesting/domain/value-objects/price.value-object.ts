import Decimal from 'decimal.js';

/**
 * Immutable value object for price.
 * All price operations use Decimal.js for precision (no floating point errors).
 */
export class Price {
  private readonly value: Decimal;

  private constructor(value: Decimal) {
    this.value = value;
  }

  /**
   * Factory: create from string or number
   */
  public static from(value: string | number): Price {
    if (typeof value === 'string' && value.length === 0) {
      throw new Error('Price: value cannot be empty string');
    }
    try {
      const decimal = new Decimal(value);
      if (decimal.isNaN() || decimal.isNegative()) {
        throw new Error('Price must be a valid positive number');
      }
      return new Price(decimal);
    } catch {
      throw new Error(`Invalid price: ${value}`);
    }
  }

  /**
   * Factory: Zero price
   */
  public static zero(): Price {
    return new Price(new Decimal(0));
  }

  /**
   * Get Decimal instance
   */
  public toDecimal(): Decimal {
    return this.value;
  }

  /**
   * String representation (for storage/display)
   */
  public toString(): string {
    return this.value.toString();
  }

  /**
   * Formatted for display (8 decimals)
   */
  public toFixed(decimals: number = 8): string {
    return this.value.toFixed(decimals);
  }

  /**
   * Numeric representation (use sparingly, may lose precision)
   */
  public toNumber(): number {
    return this.value.toNumber();
  }

  /**
   * Comparisons
   */
  public isGreaterThan(other: Price): boolean {
    return this.value.greaterThan(other.value);
  }

  public isGreaterThanOrEqual(other: Price): boolean {
    return this.value.greaterThanOrEqualTo(other.value);
  }

  public isLessThan(other: Price): boolean {
    return this.value.lessThan(other.value);
  }

  public isLessThanOrEqual(other: Price): boolean {
    return this.value.lessThanOrEqualTo(other.value);
  }

  public equals(other: Price): boolean {
    return this.value.equals(other.value);
  }

  /**
   * Arithmetic
   */
  public add(other: Price): Price {
    return new Price(this.value.plus(other.value));
  }

  public subtract(other: Price): Price {
    return new Price(this.value.minus(other.value));
  }

  public multiply(factor: number | string | Decimal): Price {
    return new Price(this.value.times(factor));
  }

  public divide(divisor: number | string | Decimal): Price {
    return new Price(this.value.dividedBy(divisor));
  }

  /**
   * Percentage change: (this - other) / other * 100
   */
  public percentChangeFrom(other: Price): Decimal {
    if (other.value.isZero()) {
      throw new Error('Cannot calculate percent change from zero price');
    }
    return this.value.minus(other.value).dividedBy(other.value).times(100);
  }
}
