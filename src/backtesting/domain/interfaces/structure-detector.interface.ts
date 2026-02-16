import { Candle } from '../entities/candle.entity';
import { StructureState } from '../entities/structure-state.entity';

/**
 * Structure detector interface.
 * Detects internal structure and Break of Structure (BOS) on 1m candles.
 */
export interface IStructureDetector {
  /**
   * Process 1m candles to track internal structure.
   * Returns updated StructureState, or null if no BOS detected.
   */
  detect(candle: Candle): StructureState | null;

  /**
   * Get current structure state
   */
  getCurrentState(): StructureState | null;

  /**
   * Batch reset for new backtest
   */
  reset(): void;
}

export const STRUCTURE_DETECTOR_TOKEN = Symbol('IStructureDetector');
