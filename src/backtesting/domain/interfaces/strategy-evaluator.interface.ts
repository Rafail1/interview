import { Candle } from '../entities/candle.entity';
import { Signal } from '../entities/signal.entity';

export type StrategyEvaluationConfig = {
  minFvgSizePercent: number;
  maxFvgSizePercent: number;
};

/**
 * Strategy evaluator interface.
 * Combines multiple detectors (FVG, structure, etc.) to generate trading signals.
 */
export interface IStrategyEvaluator {
  /**
   * Configure evaluator behavior for a run.
   */
  configure?(config: StrategyEvaluationConfig): void;

  /**
   * Evaluate candle (both 1m and 15m aggregated) to generate signals.
   * Returns array of signals (may be empty).
   */
  evaluate(candle1m: Candle, candle15m: Candle | null): Signal[];

  /**
   * Batch reset for new backtest
   */
  reset(): void;
}

export const STRATEGY_EVALUATOR_TOKEN = Symbol('IStrategyEvaluator');
