import Decimal from 'decimal.js';
import { Price, Timestamp } from '../value-objects';

export type TradeStatus = 'open' | 'closed' | 'cancelled';
export type TradeSide = 'BUY' | 'SELL';

/**
 * Trade entity: represents an executed trade in backtest.
 */
export class Trade {
  private exitTime: Timestamp | null = null;
  private exitPrice: Price | null = null;
  private status: TradeStatus = 'open';
  private pnl: Decimal | null = null;
  private pnlPercent: number = 0;

  private constructor(
    private readonly id: string,
    private readonly entryTime: Timestamp,
    private readonly entryPrice: Price,
    private readonly quantity: Decimal,
    private readonly side: TradeSide,
  ) {
    if (quantity.isNegative() || quantity.isZero()) {
      throw new Error('Trade quantity must be positive');
    }
  }

  /**
   * Factory: create new trade
   */
  public static create(
    id: string,
    entryTime: Timestamp,
    entryPrice: Price,
    quantity: number | string | Decimal,
    side: TradeSide,
  ): Trade {
    return new Trade(id, entryTime, entryPrice, new Decimal(quantity), side);
  }

  /**
   * Getters
   */
  public getId(): string {
    return this.id;
  }

  public getEntryTime(): Timestamp {
    return this.entryTime;
  }

  public getEntryPrice(): Price {
    return this.entryPrice;
  }

  public getQuantity(): Decimal {
    return this.quantity;
  }

  public getSide(): TradeSide {
    return this.side;
  }

  public getStatus(): TradeStatus {
    return this.status;
  }

  public getExitTime(): Timestamp | null {
    return this.exitTime;
  }

  public getExitPrice(): Price | null {
    return this.exitPrice;
  }

  public getPnL(): Decimal | null {
    return this.pnl;
  }

  public getPnLPercent(): number {
    return this.pnlPercent;
  }

  /**
   * Is trade closed?
   */
  public isClosed(): boolean {
    return this.status !== 'open';
  }

  /**
   * Is trade profitable?
   */
  public isProfitable(): boolean {
    if (!this.pnl) return false;
    return this.pnl.greaterThan(0);
  }

  /**
   * Close trade with exit price
   */
  public close(exitTime: Timestamp, exitPrice: Price): void {
    if (this.status !== 'open') {
      throw new Error(`Cannot close trade with status: ${this.status}`);
    }

    this.exitTime = exitTime;
    this.exitPrice = exitPrice;
    this.status = 'closed';
    this.calculatePnL();
  }

  /**
   * Cancel trade
   */
  public cancel(): void {
    if (this.status === 'closed') {
      throw new Error('Cannot cancel a closed trade');
    }
    this.status = 'cancelled';
  }

  /**
   * Calculate PnL (works for both long and short)
   */
  private calculatePnL(): void {
    if (!this.exitPrice) {
      throw new Error('Cannot calculate PnL without exit price');
    }

    const notional = this.quantity.times(this.entryPrice.toDecimal());

    let profit: Decimal;
    if (this.side === 'BUY') {
      // Long: profit = quantity * (exit - entry)
      profit = this.quantity.times(
        this.exitPrice.toDecimal().minus(this.entryPrice.toDecimal()),
      );
    } else {
      // Short: profit = quantity * (entry - exit)
      profit = this.quantity.times(
        this.entryPrice.toDecimal().minus(this.exitPrice.toDecimal()),
      );
    }

    this.pnl = profit;
    if (!notional.isZero()) {
      this.pnlPercent = profit.dividedBy(notional).times(100).toNumber();
    }
  }

  /**
   * Serialization
   */
  public toJSON() {
    return {
      id: this.id,
      entryTime: this.entryTime.toMsNumber(),
      entryPrice: this.entryPrice.toString(),
      exitTime: this.exitTime?.toMsNumber() ?? null,
      exitPrice: this.exitPrice?.toString() ?? null,
      quantity: this.quantity.toString(),
      side: this.side,
      status: this.status,
      pnl: this.pnl?.toString() ?? null,
      pnlPercent: this.pnlPercent,
    };
  }
}
