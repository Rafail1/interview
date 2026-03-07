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
  private readonly signaledZoneIds = new Set<string>();
  private lastProcessedHigherCloseMs: bigint | null = null;
  private minFvgSizePercent = StrategyEvaluator.DEFAULT_MIN_FVG_SIZE_PERCENT;
  private maxFvgSizePercent = StrategyEvaluator.DEFAULT_MAX_FVG_SIZE_PERCENT;
  private readonly diagnostics: Record<string, number> = {};

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
    this.incrementDiagnostic('processedCandles');
    if (candle15m) {
      this.incrementDiagnostic('higherContextProvided');
      const higherCloseMs = candle15m.getCloseTime().toMs();
      if (this.lastProcessedHigherCloseMs !== higherCloseMs) {
        this.fvgDetector.detect(candle15m);
        this.lastProcessedHigherCloseMs = higherCloseMs;
        this.incrementDiagnostic('higherContextCandleProcessed');
      }
    }

    // Keep structure detector warm/stateful even if BOS is not used for entry now.
    this.structureDetector.detect(candle1m);
    const activeFvgs = this.fvgDetector
      .getCurrentState()
      .filter((zone) => !zone.isMitigated());
    if (activeFvgs.length === 0) {
      this.incrementDiagnostic('noActiveFvg');
      return [];
    }

    const price = candle1m.getClose();
    const time = candle1m.getCloseTime();
    const signalId = `signal-${time.toMsNumber()}`;
    for (const zone of activeFvgs) {
      if (this.signaledZoneIds.has(zone.getId())) {
        continue;
      }
      const touched =
        candle1m.getLow().isLessThanOrEqual(zone.getUpperBound()) &&
        candle1m.getHigh().isGreaterThanOrEqual(zone.getLowerBound());
      if (!touched) {
        continue;
      }

      if (!this.isAllowedZoneSize(zone, price)) {
        this.incrementDiagnostic('filteredByFvgSize');
        this.signaledZoneIds.add(zone.getId());
        continue;
      }

      this.signaledZoneIds.add(zone.getId());
      if (zone.isBullish()) {
        this.incrementDiagnostic('signalBuy');
        return [
          Signal.createBuy(
            signalId,
            price,
            time,
            'bullish_fvg_first_mitigation_entry',
            {
              candle15m: candle15m?.toJSON() ?? null,
              reactedZoneId: zone.getId(),
              fvg: {
                id: zone.getId(),
                direction: 'bullish',
                upperBound: zone.getUpperBound().toString(),
                lowerBound: zone.getLowerBound().toString(),
                sizePercent:
                  this.calculateZoneSizePercent(zone, price)?.toNumber() ?? null,
              },
            },
          ),
        ];
      }
      this.incrementDiagnostic('signalSell');
      return [
        Signal.createSell(
          signalId,
          price,
          time,
          'bearish_fvg_first_mitigation_entry',
          {
            candle15m: candle15m?.toJSON() ?? null,
            reactedZoneId: zone.getId(),
            fvg: {
              id: zone.getId(),
              direction: 'bearish',
              upperBound: zone.getUpperBound().toString(),
              lowerBound: zone.getLowerBound().toString(),
              sizePercent:
                this.calculateZoneSizePercent(zone, price)?.toNumber() ?? null,
            },
          },
        ),
      ];
    }

    this.incrementDiagnostic('noMitigationTouch');
    return [];
  }

  public reset(): void {
    this.signaledZoneIds.clear();
    this.lastProcessedHigherCloseMs = null;
    this.minFvgSizePercent = StrategyEvaluator.DEFAULT_MIN_FVG_SIZE_PERCENT;
    this.maxFvgSizePercent = StrategyEvaluator.DEFAULT_MAX_FVG_SIZE_PERCENT;
    for (const key of Object.keys(this.diagnostics)) {
      delete this.diagnostics[key];
    }
    this.fvgDetector.reset();
    this.structureDetector.reset();
  }

  public getDiagnostics(): Record<string, number> {
    return {
      ...this.diagnostics,
      signaledZones: this.signaledZoneIds.size,
      minFvgSizePercent: this.minFvgSizePercent,
      maxFvgSizePercent: this.maxFvgSizePercent,
    };
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

  private incrementDiagnostic(key: string): void {
    this.diagnostics[key] = (this.diagnostics[key] ?? 0) + 1;
  }

}
