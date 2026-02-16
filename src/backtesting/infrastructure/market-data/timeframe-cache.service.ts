import { Injectable } from '@nestjs/common';
import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import { Timeframe } from 'src/backtesting/domain/value-objects/timeframe.value-object';
import { CandleAggregator } from './candle.aggregator';

/**
 * Caches aggregated candles to avoid re-aggregating the same data.
 * Useful when running multiple strategies on the same symbol/timeframe.
 */
@Injectable()
export class TimeframeCacheService {
  private cache: Map<string, Candle[]> = new Map();

  /**
   * Generate cache key from symbol + timeframe
   */
  private getCacheKey(symbol: string, timeframe: Timeframe): string {
    return `${symbol}:${timeframe.toString()}`;
  }

  /**
   * Store candles in cache
   */
  public cache1mCandles(symbol: string, candles: Candle[]): void {
    const key = this.getCacheKey(symbol, Timeframe.from('1m'));
    this.cache.set(key, candles);
  }

  /**
   * Retrieve and aggregate from 1m cache to target timeframe
   * Returns null if 1m candles not cached
   */
  public getAggregated(symbol: string, timeframe: Timeframe): Candle[] | null {
    const oneMinKey = this.getCacheKey(symbol, Timeframe.from('1m'));
    const cached1m = this.cache.get(oneMinKey);

    if (!cached1m) {
      return null;
    }

    // Check if already cached at target timeframe
    const targetKey = this.getCacheKey(symbol, timeframe);
    const cached = this.cache.get(targetKey);
    if (cached) {
      return cached;
    }

    // Aggregate from 1m to target
    const aggregated = CandleAggregator.aggregate(
      cached1m,
      Timeframe.from('1m'),
      timeframe,
    );

    // Store in cache for next time
    this.cache.set(targetKey, aggregated);

    return aggregated;
  }

  /**
   * Clear all cached candles
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size (for monitoring)
   */
  public getSize(): number {
    return this.cache.size;
  }

  /**
   * Get memory estimate in bytes (rough approximation)
   */
  public getMemoryEstimate(): number {
    let totalBytes = 0;

    for (const candles of this.cache.values()) {
      // Rough estimate: ~200 bytes per Candle object
      totalBytes += candles.length * 200;
    }

    return totalBytes;
  }
}
