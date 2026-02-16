import { Inject, Injectable } from '@nestjs/common';
import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import { Signal } from 'src/backtesting/domain/entities/signal.entity';
import {
  FVG_DETECTOR_TOKEN,
  type IFvgDetector,
} from 'src/backtesting/domain/interfaces/fvg-detector.interface';
import {
  type IStructureDetector,
  STRUCTURE_DETECTOR_TOKEN,
} from 'src/backtesting/domain/interfaces/structure-detector.interface';
import { IStrategyEvaluator } from 'src/backtesting/domain/interfaces/strategy-evaluator.interface';

@Injectable()
export class StrategyEvaluator implements IStrategyEvaluator {
  constructor(
    @Inject(FVG_DETECTOR_TOKEN) private readonly fvgDetector: IFvgDetector,
    @Inject(STRUCTURE_DETECTOR_TOKEN)
    private readonly structureDetector: IStructureDetector,
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

    const activeFvgs = this.fvgDetector
      .getCurrentState()
      .filter((zone) => !zone.isMitigated());
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
