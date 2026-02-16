import { Candle } from '../entities/candle.entity';
import { FVGZone } from '../entities/fvg-zone.entity';

/**
 * FVG detector interface.
 * Detects Fair Value Gaps on aggregated timeframe (typically 15m).
 */
export interface IFvgDetector {
  /**
   * Process 15m candles and detect FVG zones.
   * Returns array of FVGZone for the input candle.
   */
  detect(candle: Candle): FVGZone[];

  /**
   * Get all detected zones.
   */
  getCurrentState(): FVGZone[];

  /**
   * Batch reset for new backtest
   */
  reset(): void;
}

export const FVG_DETECTOR_TOKEN = Symbol('IFvgDetector');
