import { Injectable } from '@nestjs/common';
import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import { Signal } from 'src/backtesting/domain/entities/signal.entity';
import { IStrategyEvaluator } from 'src/backtesting/domain/interfaces/strategy-evaluator.interface';
import { FvgDetector } from './fvg.detector';
import { StructureDetector } from './structure.detector';

@Injectable()
export class StrategyEvaluator implements IStrategyEvaluator {
  constructor(
    private readonly fvgDetector: FvgDetector,
    private readonly structureDetector: StructureDetector,
  ) {}

  public evaluate(candle1m: Candle, candle15m: Candle | null = null): Signal[] {
    this.fvgDetector.detect(candle1m);
    const structure = this.structureDetector.detect(candle1m);

    if (!structure) {
      return [];
    }

    const bosType = structure.getBoSType();
    if (!bosType) {
      return [];
    }

    const activeFvgs = this.fvgDetector.getActiveFvgs();
    const price = candle1m.getClose();
    const time = candle1m.getCloseTime();
    const signalId = `signal-${time.toMsNumber()}`;

    const hasBullishFvgSupport = activeFvgs.some(
      (zone) =>
        zone.isBullish() && zone.getLowerBound().isLessThanOrEqual(price),
    );
    const hasBearishFvgResistance = activeFvgs.some(
      (zone) =>
        zone.isBearish() && zone.getUpperBound().isGreaterThanOrEqual(price),
    );

    if (bosType === 'bullish') {
      if (hasBullishFvgSupport) {
        return [
          Signal.createBuy(
            signalId,
            price,
            time,
            'bullish_bos_fvg_confluence',
            {
              candle15m: candle15m?.toJSON() ?? null,
            },
          ),
        ];
      }
      return [
        Signal.createInvalid(signalId, price, time, 'bullish_bos_no_fvg'),
      ];
    }

    if (hasBearishFvgResistance) {
      return [
        Signal.createSell(signalId, price, time, 'bearish_bos_fvg_confluence', {
          candle15m: candle15m?.toJSON() ?? null,
        }),
      ];
    }
    return [Signal.createInvalid(signalId, price, time, 'bearish_bos_no_fvg')];
  }

  public reset(): void {
    this.fvgDetector.reset();
    this.structureDetector.reset();
  }
}
