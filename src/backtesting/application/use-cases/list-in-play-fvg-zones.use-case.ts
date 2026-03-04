import { Injectable, Inject } from '@nestjs/common';
import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import { Price } from 'src/backtesting/domain/value-objects/price.value-object';
import { Timestamp } from 'src/backtesting/domain/value-objects/timestamp.value-object';
import {
  IN_PLAY_RUN_REPOSITORY_TOKEN,
  type InPlayRangeView,
  type IInPlayRunRepository,
} from 'src/backtesting/domain/interfaces/in-play-run-repository.interface';
import {
  MARKET_DATA_REPOSITORY_TOKEN,
  type IMarketDataRepository,
} from 'src/backtesting/domain/interfaces/market-data-repository.interface';
import { ListInPlayFvgZonesQueryDto } from 'src/backtesting/interfaces/dtos/list-in-play-fvg-zones-query.dto';
import { ListInPlayFvgZonesResponseDto } from 'src/backtesting/interfaces/dtos/list-in-play-fvg-zones-response.dto';

type PendingZone = {
  id: string;
  rangeId: string;
  symbol: string;
  interval: string;
  direction: 'bullish' | 'bearish';
  startTime: bigint;
  endTime: bigint;
  lowerBound: string;
  upperBound: string;
  mitigated: boolean;
  mitigatedTime: bigint | null;
  mitigatedPrice: string | null;
  mitigatedCandleOpenTime: bigint | null;
  mitigatedCandleCloseTime: bigint | null;
  activationReason: 'both' | 'volume_only' | 'volatility_only';
};

@Injectable()
export class ListInPlayFvgZonesUseCase {
  constructor(
    @Inject(IN_PLAY_RUN_REPOSITORY_TOKEN)
    private readonly inPlayRepository: IInPlayRunRepository,
    @Inject(MARKET_DATA_REPOSITORY_TOKEN)
    private readonly marketDataRepository: IMarketDataRepository,
  ) {}

  public async execute(
    runId: string,
    query: ListInPlayFvgZonesQueryDto,
  ): Promise<ListInPlayFvgZonesResponseDto | null> {
    const symbol = query.symbol?.toUpperCase();
    const ranges = await this.inPlayRepository.listRanges(runId, symbol);
    if (!ranges) {
      return null;
    }

    const items: ListInPlayFvgZonesResponseDto['items'] = [];
    for (const range of ranges) {
      const zones = await this.rebuildRangeFvgZones(range);
      for (const zone of zones) {
        items.push({
          id: zone.id,
          rangeId: zone.rangeId,
          symbol: zone.symbol,
          interval: zone.interval,
          direction: zone.direction,
          startTime: zone.startTime.toString(),
          endTime: zone.endTime.toString(),
          lowerBound: zone.lowerBound,
          upperBound: zone.upperBound,
          mitigated: zone.mitigated,
          mitigatedTime: zone.mitigatedTime?.toString() ?? null,
          mitigatedPrice: zone.mitigatedPrice,
          mitigatedCandleOpenTime: zone.mitigatedCandleOpenTime?.toString() ?? null,
          mitigatedCandleCloseTime: zone.mitigatedCandleCloseTime?.toString() ?? null,
          activationReason: zone.activationReason,
          description: zone.mitigated
            ? `mitigated at ${zone.mitigatedTime?.toString()}`
            : 'unmitigated',
        });
      }
    }

    return { runId, items };
  }

  private async rebuildRangeFvgZones(
    range: InPlayRangeView,
  ): Promise<PendingZone[]> {
    const candles: Candle[] = [];
    for await (const candle of this.marketDataRepository.getCandleStream(
      range.symbol,
      range.interval,
      Timestamp.fromMs(BigInt(range.startTime)),
      Timestamp.fromMs(BigInt(range.endTime)),
    )) {
      candles.push(candle);
    }

    if (candles.length < 3) {
      return [];
    }

    const zones: PendingZone[] = [];
    for (let index = 0; index < candles.length; index += 1) {
      const current = candles[index];
      this.tryMitigate(zones, current);

      if (index < 2) {
        continue;
      }

      const first = candles[index - 2];
      if (first.getHigh().isLessThan(current.getLow())) {
        zones.push({
          id: `${range.id}-bull-${current.getOpenTime().toMs().toString()}`,
          rangeId: range.id,
          symbol: range.symbol,
          interval: range.interval,
          direction: 'bullish',
          startTime: current.getOpenTime().toMs(),
          endTime: BigInt(range.endTime),
          lowerBound: first.getHigh().toString(),
          upperBound: current.getLow().toString(),
          mitigated: false,
          mitigatedTime: null,
          mitigatedPrice: null,
          mitigatedCandleOpenTime: null,
          mitigatedCandleCloseTime: null,
          activationReason: range.activationReason,
        });
      }

      if (first.getLow().isGreaterThan(current.getHigh())) {
        zones.push({
          id: `${range.id}-bear-${current.getOpenTime().toMs().toString()}`,
          rangeId: range.id,
          symbol: range.symbol,
          interval: range.interval,
          direction: 'bearish',
          startTime: current.getOpenTime().toMs(),
          endTime: BigInt(range.endTime),
          lowerBound: current.getHigh().toString(),
          upperBound: first.getLow().toString(),
          mitigated: false,
          mitigatedTime: null,
          mitigatedPrice: null,
          mitigatedCandleOpenTime: null,
          mitigatedCandleCloseTime: null,
          activationReason: range.activationReason,
        });
      }
    }

    return zones;
  }

  private tryMitigate(zones: PendingZone[], candle: Candle): void {
    for (const zone of zones) {
      if (zone.mitigated) {
        continue;
      }

      const lower = Price.from(zone.lowerBound);
      const upper = Price.from(zone.upperBound);
      const touchesUpper = candle.getLow().isLessThanOrEqual(upper);
      const touchesLower = candle.getHigh().isGreaterThanOrEqual(lower);
      if (!touchesUpper || !touchesLower) {
        continue;
      }

      zone.mitigated = true;
      zone.mitigatedTime = candle.getCloseTime().toMs();
      zone.mitigatedPrice = candle.getClose().toString();
      zone.mitigatedCandleOpenTime = candle.getOpenTime().toMs();
      zone.mitigatedCandleCloseTime = candle.getCloseTime().toMs();
      zone.endTime = candle.getCloseTime().toMs();
    }
  }
}
