import { Candle } from '../entities/candle.entity';
import { Timestamp, Timeframe } from '../value-objects';

/**
 * Market data repository interface.
 * Abstracts data persistence and retrieval.
 */
export interface IMarketDataRepository {
  /**
   * Get candles as async iterable (streaming).
   * Enables memory-efficient processing of large datasets.
   */
  getCandleStream(
    symbol: string,
    interval: string,
    startTime: Timestamp,
    endTime: Timestamp,
  ): AsyncIterable<Candle>;

  /**
   * Get aggregated candles (e.g., 1m → 15m).
   */
  getAggregatedStream(
    symbol: string,
    fromInterval: Timeframe,
    toInterval: Timeframe,
    startTime: Timestamp,
    endTime: Timestamp,
  ): AsyncIterable<Candle>;

  /**
   * Save candles to persistence
   */
  saveCandles(candles: Candle[]): Promise<void>;

  /**
   * Check if data exists for symbol/interval range
   */
  hasData(
    symbol: string,
    interval: string,
    startTime: Timestamp,
    endTime: Timestamp,
  ): Promise<boolean>;
}

export const MARKET_DATA_REPOSITORY_TOKEN = Symbol('IMarketDataRepository');
