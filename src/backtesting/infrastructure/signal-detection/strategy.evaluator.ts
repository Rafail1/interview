import { Inject, Injectable } from '@nestjs/common';
import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import { FVGZone } from 'src/backtesting/domain/entities/fvg-zone.entity';
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
  private readonly reactedZones = new Map<
    string,
    { direction: 'bullish' | 'bearish'; reactedAtMs: bigint }
  >();
  private lastProcessedHigherCloseMs: bigint | null = null;

  constructor(
    @Inject(FVG_DETECTOR_TOKEN) private readonly fvgDetector: IFvgDetector,
    @Inject(STRUCTURE_DETECTOR_TOKEN)
    private readonly structureDetector: IStructureDetector,
  ) {}

  public evaluate(candle1m: Candle, candle15m: Candle | null = null): Signal[] {
    if (candle15m) {
      const higherCloseMs = candle15m.getCloseTime().toMs();
      if (this.lastProcessedHigherCloseMs !== higherCloseMs) {
        this.fvgDetector.detect(candle15m);
        this.lastProcessedHigherCloseMs = higherCloseMs;
      }
    }

    this.trackReactions(candle1m);
    this.removeStaleReactions();

    const structure = this.structureDetector.detect(candle1m);

    if (!structure) {
      return [];
    }

    const bosType = structure.getBoSType();
    if (!bosType) {
      return [];
    }

    const price = candle1m.getClose();
    const time = candle1m.getCloseTime();
    const signalId = `signal-${time.toMsNumber()}`;
    const timeMs = time.toMs();

    if (bosType === 'bullish') {
      const matchedZone = this.getMatchedReaction('bullish', timeMs);
      if (matchedZone) {
        this.consumeReactions('bullish', timeMs);
        return [
          Signal.createBuy(
            signalId,
            price,
            time,
            'bullish_bos_fvg_reaction_confluence',
            {
              candle15m: candle15m?.toJSON() ?? null,
              reactedZoneId: matchedZone,
              structure: {
                swingHigh: structure.getSwingHigh().toString(),
                swingLow: structure.getSwingLow().toString(),
                bosType: structure.getBoSType(),
                bosTimeMs: structure.getBoSTime()?.toMs().toString() ?? null,
              },
            },
          ),
        ];
      }
      return [
        Signal.createInvalid(
          signalId,
          price,
          time,
          'bullish_bos_no_fvg_reaction',
        ),
      ];
    }

    const matchedZone = this.getMatchedReaction('bearish', timeMs);
    if (matchedZone) {
      this.consumeReactions('bearish', timeMs);
      return [
        Signal.createSell(
          signalId,
          price,
          time,
          'bearish_bos_fvg_reaction_confluence',
          {
            candle15m: candle15m?.toJSON() ?? null,
            reactedZoneId: matchedZone,
            structure: {
              swingHigh: structure.getSwingHigh().toString(),
              swingLow: structure.getSwingLow().toString(),
              bosType: structure.getBoSType(),
              bosTimeMs: structure.getBoSTime()?.toMs().toString() ?? null,
            },
          },
        ),
      ];
    }
    return [
      Signal.createInvalid(
        signalId,
        price,
        time,
        'bearish_bos_no_fvg_reaction',
      ),
    ];
  }

  public reset(): void {
    this.reactedZones.clear();
    this.lastProcessedHigherCloseMs = null;
    this.fvgDetector.reset();
    this.structureDetector.reset();
  }

  private trackReactions(candle1m: Candle): void {
    const activeFvgs = this.fvgDetector
      .getCurrentState()
      .filter((zone) => !zone.isMitigated());

    for (const zone of activeFvgs) {
      if (zone.isBullish() && this.isBullishReaction(zone, candle1m)) {
        this.reactedZones.set(zone.getId(), {
          direction: 'bullish',
          reactedAtMs: candle1m.getCloseTime().toMs(),
        });
      }
      if (zone.isBearish() && this.isBearishReaction(zone, candle1m)) {
        this.reactedZones.set(zone.getId(), {
          direction: 'bearish',
          reactedAtMs: candle1m.getCloseTime().toMs(),
        });
      }
    }
  }

  private removeStaleReactions(): void {
    const activeIds = new Set(
      this.fvgDetector
        .getCurrentState()
        .filter((zone) => !zone.isMitigated())
        .map((zone) => zone.getId()),
    );

    for (const zoneId of this.reactedZones.keys()) {
      if (!activeIds.has(zoneId)) {
        this.reactedZones.delete(zoneId);
      }
    }
  }

  private isBullishReaction(zone: FVGZone, candle: Candle): boolean {
    const touchesZone =
      candle.getLow().isLessThanOrEqual(zone.getUpperBound()) &&
      candle.getHigh().isGreaterThanOrEqual(zone.getLowerBound());

    return (
      touchesZone &&
      candle.getClose().isGreaterThanOrEqual(zone.getUpperBound())
    );
  }

  private isBearishReaction(zone: FVGZone, candle: Candle): boolean {
    const touchesZone =
      candle.getLow().isLessThanOrEqual(zone.getUpperBound()) &&
      candle.getHigh().isGreaterThanOrEqual(zone.getLowerBound());

    return (
      touchesZone && candle.getClose().isLessThanOrEqual(zone.getLowerBound())
    );
  }

  private getMatchedReaction(
    direction: 'bullish' | 'bearish',
    bosTimeMs: bigint,
  ): string | null {
    for (const [zoneId, state] of this.reactedZones.entries()) {
      if (state.direction === direction && state.reactedAtMs <= bosTimeMs) {
        return zoneId;
      }
    }
    return null;
  }

  private consumeReactions(
    direction: 'bullish' | 'bearish',
    bosTimeMs: bigint,
  ): void {
    for (const [zoneId, state] of this.reactedZones.entries()) {
      if (state.direction === direction && state.reactedAtMs <= bosTimeMs) {
        this.reactedZones.delete(zoneId);
      }
    }
  }
}
