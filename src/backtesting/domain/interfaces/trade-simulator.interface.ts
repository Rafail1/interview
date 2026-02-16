import { Signal } from '../entities/signal.entity';
import { Trade } from '../entities/trade.entity';
import { Candle } from '../entities/candle.entity';
import { RiskModel } from '../value-objects';

/**
 * Trade simulator interface.
 * Converts signals to trades, calculates PnL with slippage/fees.
 */
export interface ITradeSimulator {
  /**
   * Process signal and create trade if valid.
   * Returns Trade if executed, null if skipped.
   */
  processSignal(signal: Signal, riskModel: RiskModel): Trade | null;

  /**
   * Close any open trade at given candle price.
   * Used for stop-loss/take-profit or at backtest end.
   */
  closeOpenTrade(candle: Candle, reason: string): Trade | null;

  /**
   * Get open trade, if any
   */
  getOpenTrade(): Trade | null;

  /**
   * Get all closed trades
   */
  getClosedTrades(): Trade[];

  /**
   * Batch reset for new backtest
   */
  reset(): void;
}

export const TRADE_SIMULATOR_TOKEN = Symbol('ITradeSimulator');
