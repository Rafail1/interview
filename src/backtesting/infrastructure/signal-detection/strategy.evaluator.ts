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
import { Price } from 'src/backtesting/domain/value-objects';

type Direction = 'bullish' | 'bearish';
type ZoneType = 'fvg' | 'orderBlock';
type EntryZone = {
  type: ZoneType;
  direction: Direction;
  upperBound: Price;
  lowerBound: Price;
  fvgSizePercent: number;
};
type OrderBlockRange = {
  upperBound: Price;
  lowerBound: Price;
};

@Injectable()
export class StrategyEvaluator implements IStrategyEvaluator {
  private static readonly LARGE_FVG_THRESHOLD_PERCENT = 4;
  private readonly reactedOrderBlocks = new Map<
    string,
    { direction: Direction; reactedAtMs: bigint }
  >();
  private readonly higherTimeframeHistory: Candle[] = [];
  private readonly fvgOrderBlocks = new Map<string, OrderBlockRange>();
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
        this.higherTimeframeHistory.push(candle15m);
        const detectedFvgs = this.fvgDetector.detect(candle15m) ?? [];
        for (const fvg of detectedFvgs) {
          this.captureOrderBlockForFvg(fvg);
        }
        this.lastProcessedHigherCloseMs = higherCloseMs;
      }
    }

    this.trackOrderBlockReactions(candle1m);
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
      const matchedZoneId = this.getMatchedReaction('bullish', timeMs);
      if (matchedZoneId) {
        const matchedFvg = this.getActiveFvgById(matchedZoneId);
        const entryZone = matchedFvg ? this.resolveEntryZone(matchedFvg) : null;
        this.consumeReactions('bullish', timeMs);
        return [
          Signal.createBuy(
            signalId,
            price,
            time,
            'bullish_bos_fvg_reaction_confluence',
            {
              candle15m: candle15m?.toJSON() ?? null,
              reactedZoneId: matchedZoneId,
              entryZone: entryZone
                ? {
                    type: entryZone.type,
                    direction: entryZone.direction,
                    upperBound: entryZone.upperBound.toString(),
                    lowerBound: entryZone.lowerBound.toString(),
                    fvgSizePercent: entryZone.fvgSizePercent,
                  }
                : null,
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

    const matchedZoneId = this.getMatchedReaction('bearish', timeMs);
    if (matchedZoneId) {
      const matchedFvg = this.getActiveFvgById(matchedZoneId);
      const entryZone = matchedFvg ? this.resolveEntryZone(matchedFvg) : null;
      this.consumeReactions('bearish', timeMs);
      return [
        Signal.createSell(
          signalId,
          price,
          time,
          'bearish_bos_fvg_reaction_confluence',
          {
            candle15m: candle15m?.toJSON() ?? null,
            reactedZoneId: matchedZoneId,
            entryZone: entryZone
              ? {
                  type: entryZone.type,
                  direction: entryZone.direction,
                  upperBound: entryZone.upperBound.toString(),
                  lowerBound: entryZone.lowerBound.toString(),
                  fvgSizePercent: entryZone.fvgSizePercent,
                }
              : null,
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
    this.reactedOrderBlocks.clear();
    this.higherTimeframeHistory.length = 0;
    this.fvgOrderBlocks.clear();
    this.lastProcessedHigherCloseMs = null;
    this.fvgDetector.reset();
    this.structureDetector.reset();
  }

  private trackOrderBlockReactions(candle1m: Candle): void {
    const activeFvgs = this.getActiveFvgs();
    for (const fvg of activeFvgs) {
      const entryZone = this.resolveEntryZone(fvg);
      if (
        entryZone.direction === 'bullish' &&
        this.isBullishReaction(entryZone, candle1m)
      ) {
        this.reactedOrderBlocks.set(fvg.getId(), {
          direction: 'bullish',
          reactedAtMs: candle1m.getCloseTime().toMs(),
        });
      }
      if (
        entryZone.direction === 'bearish' &&
        this.isBearishReaction(entryZone, candle1m)
      ) {
        this.reactedOrderBlocks.set(fvg.getId(), {
          direction: 'bearish',
          reactedAtMs: candle1m.getCloseTime().toMs(),
        });
      }
    }
  }

  private removeStaleReactions(): void {
    const activeIds = new Set(this.getActiveFvgs().map((fvg) => fvg.getId()));

    for (const blockId of this.reactedOrderBlocks.keys()) {
      if (!activeIds.has(blockId)) {
        this.reactedOrderBlocks.delete(blockId);
      }
    }
  }

  private isBullishReaction(zone: EntryZone, candle: Candle): boolean {
    const touchesZone =
      candle.getLow().isLessThanOrEqual(zone.upperBound) &&
      candle.getHigh().isGreaterThanOrEqual(zone.lowerBound);
    if (zone.type === 'fvg') {
      return touchesZone && candle.getClose().isGreaterThanOrEqual(zone.upperBound);
    }
    return touchesZone && candle.getClose().isGreaterThan(candle.getOpen());
  }

  private isBearishReaction(zone: EntryZone, candle: Candle): boolean {
    const touchesZone =
      candle.getLow().isLessThanOrEqual(zone.upperBound) &&
      candle.getHigh().isGreaterThanOrEqual(zone.lowerBound);
    if (zone.type === 'fvg') {
      return touchesZone && candle.getClose().isLessThanOrEqual(zone.lowerBound);
    }
    return touchesZone && candle.getClose().isLessThan(candle.getOpen());
  }

  private getMatchedReaction(
    direction: Direction,
    bosTimeMs: bigint,
  ): string | null {
    for (const [zoneId, state] of this.reactedOrderBlocks.entries()) {
      if (state.direction === direction && state.reactedAtMs <= bosTimeMs) {
        return zoneId;
      }
    }
    return null;
  }

  private consumeReactions(
    direction: Direction,
    bosTimeMs: bigint,
  ): void {
    for (const [zoneId, state] of this.reactedOrderBlocks.entries()) {
      if (state.direction === direction && state.reactedAtMs <= bosTimeMs) {
        this.reactedOrderBlocks.delete(zoneId);
      }
    }
  }

  private captureOrderBlockForFvg(fvg: FVGZone): void {
    const anchorIndex = this.higherTimeframeHistory.length - 3;
    if (anchorIndex < 0) {
      return;
    }

    const isBullishFvg = fvg.isBullish();
    const isDesiredColor = (candle: Candle): boolean =>
      isBullishFvg ? candle.isBearish() : candle.isBullish();

    // Find the last opposite-color candle before the impulse that created FVG.
    let blockEnd = anchorIndex;
    while (
      blockEnd >= 0 &&
      !isDesiredColor(this.higherTimeframeHistory[blockEnd])
    ) {
      blockEnd -= 1;
    }
    if (blockEnd < 0) {
      return;
    }

    // Expand backwards to include consecutive same-colored candles as one OB block.
    let blockStart = blockEnd;
    while (blockStart > 0) {
      const previous = this.higherTimeframeHistory[blockStart - 1];
      const previousMatches = isDesiredColor(previous);
      if (!previousMatches) {
        break;
      }
      blockStart -= 1;
    }

    const blockCandles = this.higherTimeframeHistory.slice(
      blockStart,
      blockEnd + 1,
    );
    if (blockCandles.length === 0) {
      return;
    }

    let upperBound = blockCandles[0].getHigh();
    let lowerBound = blockCandles[0].getLow();
    for (const candle of blockCandles.slice(1)) {
      if (candle.getHigh().isGreaterThan(upperBound)) {
        upperBound = candle.getHigh();
      }
      if (candle.getLow().isLessThan(lowerBound)) {
        lowerBound = candle.getLow();
      }
    }

    this.fvgOrderBlocks.set(fvg.getId(), {
      upperBound,
      lowerBound,
    });
  }

  private getActiveFvgs(): FVGZone[] {
    return this.fvgDetector
      .getCurrentState()
      .filter((zone) => !zone.isMitigated());
  }

  private getActiveFvgById(zoneId: string): FVGZone | null {
    return this.getActiveFvgs().find((zone) => zone.getId() === zoneId) ?? null;
  }

  private resolveEntryZone(fvg: FVGZone): EntryZone {
    const sizePercent = Number(fvg.getSizePercent().toString());
    const orderBlock = this.fvgOrderBlocks.get(fvg.getId());
    const useOrderBlock =
      sizePercent > StrategyEvaluator.LARGE_FVG_THRESHOLD_PERCENT && orderBlock;

    if (useOrderBlock) {
      return {
        type: 'orderBlock',
        direction: fvg.isBullish() ? 'bullish' : 'bearish',
        upperBound: orderBlock.upperBound,
        lowerBound: orderBlock.lowerBound,
        fvgSizePercent: sizePercent,
      };
    }

    return {
      type: 'fvg',
      direction: fvg.isBullish() ? 'bullish' : 'bearish',
      upperBound: fvg.getUpperBound(),
      lowerBound: fvg.getLowerBound(),
      fvgSizePercent: sizePercent,
    };
  }
}
