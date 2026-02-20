import { Injectable } from '@nestjs/common';
import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import { FVGZone } from 'src/backtesting/domain/entities/fvg-zone.entity';
import { IFvgDetector } from 'src/backtesting/domain/interfaces/fvg-detector.interface';

@Injectable()
export class FvgDetector implements IFvgDetector {
  private readonly history: Candle[] = [];
  private readonly zones = new Map<string, FVGZone>();

  public detect(candle: Candle): FVGZone[] {
    this.history.push(candle);
    const detected: FVGZone[] = [];

    for (const zone of this.zones.values()) {
      if (!zone.isMitigated() && this.isMitigated(zone, candle)) {
        zone.markMitigated(candle.getClose(), candle.getCloseTime());
      }
    }

    if (this.history.length >= 3) {
      const first = this.history[this.history.length - 3];
      const current = this.history[this.history.length - 1];
      const openTime = current.getOpenTime();

      if (first.getHigh().isLessThan(current.getLow())) {
        const id = `fvg-bull-${openTime.toMsNumber()}`;
        const zone = FVGZone.createBullish(
          id,
          current.getLow(),
          first.getHigh(),
          openTime,
        );
        this.zones.set(id, zone);
        detected.push(zone);
      }

      if (first.getLow().isGreaterThan(current.getHigh())) {
        const id = `fvg-bear-${openTime.toMsNumber()}`;
        const zone = FVGZone.createBearish(
          id,
          first.getLow(),
          current.getHigh(),
          openTime,
        );
        this.zones.set(id, zone);
        detected.push(zone);
      }
    }

    return detected;
  }

  public getCurrentState(): FVGZone[] {
    return Array.from(this.zones.values());
  }

  public getActiveFvgs(): FVGZone[] {
    return Array.from(this.zones.values()).filter(
      (zone) => !zone.isMitigated(),
    );
  }

  public getMitigatedFvgs(): FVGZone[] {
    return Array.from(this.zones.values()).filter((zone) => zone.isMitigated());
  }

  public reset(): void {
    this.history.length = 0;
    this.zones.clear();
  }

  private isMitigated(zone: FVGZone, candle: Candle): boolean {
    const touchesUpper = candle
      .getLow()
      .isLessThanOrEqual(zone.getUpperBound());
    const touchesLower = candle
      .getHigh()
      .isGreaterThanOrEqual(zone.getLowerBound());
    return touchesUpper && touchesLower;
  }
}
