import { Inject, Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
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
import {
  IStrategyEvaluator,
  type StrategyEvaluationConfig,
} from 'src/backtesting/domain/interfaces/strategy-evaluator.interface';
import { Price } from 'src/backtesting/domain/value-objects';

@Injectable()
export class StrategyEvaluator implements IStrategyEvaluator {
  private static readonly DEFAULT_MIN_FVG_SIZE_PERCENT = 0.8;
  private static readonly DEFAULT_MAX_FVG_SIZE_PERCENT = 4;
  private readonly reactedZones = new Map<
    string,
    { direction: 'bullish' | 'bearish'; reactedAtMs: bigint }
  >();
  private readonly signaledZoneIds = new Set<string>();
  private lastProcessedHigherCloseMs: bigint | null = null;
  private minFvgSizePercent = StrategyEvaluator.DEFAULT_MIN_FVG_SIZE_PERCENT;
  private maxFvgSizePercent = StrategyEvaluator.DEFAULT_MAX_FVG_SIZE_PERCENT;

  constructor(
    @Inject(FVG_DETECTOR_TOKEN) private readonly fvgDetector: IFvgDetector,
    @Inject(STRUCTURE_DETECTOR_TOKEN)
    private readonly structureDetector: IStructureDetector,
  ) {}

  public configure(config: StrategyEvaluationConfig): void {
    const { minFvgSizePercent, maxFvgSizePercent } = config;
    this.minFvgSizePercent =
      Number.isFinite(minFvgSizePercent) && minFvgSizePercent >= 0
        ? minFvgSizePercent
        : StrategyEvaluator.DEFAULT_MIN_FVG_SIZE_PERCENT;
    this.maxFvgSizePercent =
      Number.isFinite(maxFvgSizePercent) && maxFvgSizePercent >= 0
        ? maxFvgSizePercent
        : StrategyEvaluator.DEFAULT_MAX_FVG_SIZE_PERCENT;

    if (this.minFvgSizePercent > this.maxFvgSizePercent) {
      this.minFvgSizePercent = StrategyEvaluator.DEFAULT_MIN_FVG_SIZE_PERCENT;
      this.maxFvgSizePercent = StrategyEvaluator.DEFAULT_MAX_FVG_SIZE_PERCENT;
    }
  }

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
      const bullishZoneId = this.getMatchedReaction('bullish', timeMs);
      if (bullishZoneId) {
        if (this.signaledZoneIds.has(bullishZoneId)) {
          this.consumeReactions('bullish', timeMs);
          return [];
        }
        const matchedZone = this.getZoneById(bullishZoneId);
        this.consumeReactions('bullish', timeMs);
        if (!this.isAllowedZoneSize(matchedZone, price)) {
          return [];
        }
        this.signaledZoneIds.add(bullishZoneId);
        return [
          Signal.createBuy(
            signalId,
            price,
            time,
            'bullish_bos_after_fvg_touch_entry',
            {
              candle15m: candle15m?.toJSON() ?? null,
              reactedZoneId: bullishZoneId,
              fvg: {
                id: bullishZoneId,
                direction: 'bullish',
                upperBound: matchedZone?.getUpperBound().toString() ?? null,
                lowerBound: matchedZone?.getLowerBound().toString() ?? null,
                sizePercent:
                  this.calculateZoneSizePercent(matchedZone, price)?.toNumber() ??
                  null,
              },
            },
          ),
        ];
      }
      return [];
    }

    const bearishZoneId = this.getMatchedReaction('bearish', timeMs);
    if (bearishZoneId) {
      if (this.signaledZoneIds.has(bearishZoneId)) {
        this.consumeReactions('bearish', timeMs);
        return [];
      }
      const matchedZone = this.getZoneById(bearishZoneId);
      this.consumeReactions('bearish', timeMs);
      if (!this.isAllowedZoneSize(matchedZone, price)) {
        return [];
      }
      this.signaledZoneIds.add(bearishZoneId);
      return [
        Signal.createSell(
          signalId,
          price,
          time,
          'bearish_bos_after_fvg_touch_entry',
          {
            candle15m: candle15m?.toJSON() ?? null,
            reactedZoneId: bearishZoneId,
            fvg: {
              id: bearishZoneId,
              direction: 'bearish',
              upperBound: matchedZone?.getUpperBound().toString() ?? null,
              lowerBound: matchedZone?.getLowerBound().toString() ?? null,
              sizePercent:
                this.calculateZoneSizePercent(matchedZone, price)?.toNumber() ??
                null,
            },
          },
        ),
      ];
    }

    return [];
  }

  public reset(): void {
    this.reactedZones.clear();
    this.signaledZoneIds.clear();
    this.lastProcessedHigherCloseMs = null;
    this.minFvgSizePercent = StrategyEvaluator.DEFAULT_MIN_FVG_SIZE_PERCENT;
    this.maxFvgSizePercent = StrategyEvaluator.DEFAULT_MAX_FVG_SIZE_PERCENT;
    this.fvgDetector.reset();
    this.structureDetector.reset();
  }

  private trackReactions(candle1m: Candle): void {
    const activeFvgs = this.fvgDetector
      .getCurrentState()
      .filter((zone) => !zone.isMitigated());

    for (const zone of activeFvgs) {
      if (this.signaledZoneIds.has(zone.getId())) {
        continue;
      }
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
    return (
      candle.getLow().isLessThanOrEqual(zone.getUpperBound()) &&
      candle.getHigh().isGreaterThanOrEqual(zone.getLowerBound())
    );
  }

  private isBearishReaction(zone: FVGZone, candle: Candle): boolean {
    return (
      candle.getLow().isLessThanOrEqual(zone.getUpperBound()) &&
      candle.getHigh().isGreaterThanOrEqual(zone.getLowerBound())
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

  private getZoneById(zoneId: string): FVGZone | null {
    const activeZones = this.fvgDetector
      .getCurrentState()
      .filter((zone) => !zone.isMitigated());
    return activeZones.find((zone) => zone.getId() === zoneId) ?? null;
  }

  private isAllowedZoneSize(zone: FVGZone | null, price: Price): boolean {
    const sizePercent = this.calculateZoneSizePercent(zone, price);
    if (!sizePercent) {
      return true;
    }
    const min = new Decimal(this.minFvgSizePercent);
    const max = new Decimal(this.maxFvgSizePercent);
    return sizePercent.greaterThanOrEqualTo(min) && sizePercent.lessThanOrEqualTo(max);
  }

  private calculateZoneSizePercent(
    zone: FVGZone | null,
    price: Price,
  ): Decimal | null {
    if (!zone) {
      return null;
    }
    const upper = zone.getUpperBound().toDecimal();
    const lower = zone.getLowerBound().toDecimal();
    const width = upper.minus(lower).abs();
    if (width.lessThanOrEqualTo(0)) {
      return null;
    }
    const base = price.toDecimal().abs();
    if (base.lessThanOrEqualTo(0)) {
      return null;
    }
    return width.dividedBy(base).times(100);
  }

}
