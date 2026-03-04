import { Inject, Injectable } from '@nestjs/common';
import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import { Price } from 'src/backtesting/domain/value-objects/price.value-object';
import { Timeframe } from 'src/backtesting/domain/value-objects/timeframe.value-object';
import { Timestamp } from 'src/backtesting/domain/value-objects/timestamp.value-object';
import {
  IN_PLAY_RUN_REPOSITORY_TOKEN,
  type IInPlayRunRepository,
  type InPlayRangeView,
  type SaveInPlayEntryWindowInput,
} from 'src/backtesting/domain/interfaces/in-play-run-repository.interface';
import {
  MARKET_DATA_REPOSITORY_TOKEN,
  type IMarketDataRepository,
} from 'src/backtesting/domain/interfaces/market-data-repository.interface';
import { GenerateInPlayEntryWindowsRequestDto } from 'src/backtesting/interfaces/dtos/generate-in-play-entry-windows-request.dto';
import { GenerateInPlayEntryWindowsResponseDto } from 'src/backtesting/interfaces/dtos/generate-in-play-entry-windows-response.dto';

type FvgState = {
  zoneId: string;
  rangeId: string;
  symbol: string;
  interval: string;
  direction: 'bullish' | 'bearish';
  lowerBound: Price;
  upperBound: Price;
  zoneStartTime: bigint;
  mitigatedCandleOpenTime: bigint | null;
  mitigatedCandleCloseTime: bigint | null;
  completed: boolean;
};

@Injectable()
export class GenerateInPlayEntryWindowsUseCase {
  constructor(
    @Inject(IN_PLAY_RUN_REPOSITORY_TOKEN)
    private readonly inPlayRepository: IInPlayRunRepository,
    @Inject(MARKET_DATA_REPOSITORY_TOKEN)
    private readonly marketDataRepository: IMarketDataRepository,
  ) {}

  public async execute(
    runId: string,
    request: GenerateInPlayEntryWindowsRequestDto,
  ): Promise<GenerateInPlayEntryWindowsResponseDto | null> {
    const symbol = request.symbol?.toUpperCase();
    const ranges = await this.inPlayRepository.listRanges(runId, symbol);
    if (!ranges) {
      return null;
    }

    const windows: SaveInPlayEntryWindowInput[] = [];
    for (const range of ranges) {
      const forRange = await this.buildRangeWindows(range);
      windows.push(...forRange);
    }

    await this.inPlayRepository.replaceEntryWindows(runId, windows, symbol);
    const saved = (await this.inPlayRepository.listEntryWindows(runId, symbol)) ?? [];

    return {
      runId,
      generatedCount: windows.length,
      items: saved,
    };
  }

  private async buildRangeWindows(
    range: InPlayRangeView,
  ): Promise<SaveInPlayEntryWindowInput[]> {
    const candles: Candle[] = [];
    for await (const candle of this.marketDataRepository.getCandleStream(
      range.symbol,
      range.interval,
      Timestamp.fromMs(BigInt(range.startTime)),
      Timestamp.fromMs(BigInt(range.endTime)),
    )) {
      candles.push(candle);
    }

    if (candles.length < 4) {
      return [];
    }

    const intervalMs = BigInt(Timeframe.from(range.interval).toMs());
    const zones: FvgState[] = [];
    const windows: SaveInPlayEntryWindowInput[] = [];

    for (let index = 0; index < candles.length; index += 1) {
      const candle = candles[index];

      for (const zone of zones) {
        if (zone.completed) {
          continue;
        }
        if (zone.mitigatedCandleOpenTime === null) {
          const touchesZone =
            candle.getLow().isLessThanOrEqual(zone.upperBound) &&
            candle.getHigh().isGreaterThanOrEqual(zone.lowerBound);
          if (touchesZone) {
            zone.mitigatedCandleOpenTime = candle.getOpenTime().toMs();
            zone.mitigatedCandleCloseTime = candle.getCloseTime().toMs();
          }
          continue;
        }

        const close = candle.getClose();
        const closedOutside =
          close.isLessThan(zone.lowerBound) || close.isGreaterThan(zone.upperBound);
        if (!closedOutside) {
          continue;
        }

        const fromTime = zone.mitigatedCandleOpenTime - intervalMs;
        const safeFromTime = fromTime < 0n ? 0n : fromTime;
        windows.push({
          rangeId: zone.rangeId,
          symbol: zone.symbol,
          interval: zone.interval,
          zoneId: zone.zoneId,
          zoneDirection: zone.direction,
          zoneLowerBound: zone.lowerBound.toString(),
          zoneUpperBound: zone.upperBound.toString(),
          zoneStartTime: zone.zoneStartTime,
          mitigatedCandleOpenTime: zone.mitigatedCandleOpenTime,
          mitigatedCandleCloseTime: zone.mitigatedCandleCloseTime!,
          outsideCandleCloseTime: candle.getCloseTime().toMs(),
          fromTime: safeFromTime,
          toTime: candle.getCloseTime().toMs(),
          description:
            '1m entry window: from mitigated 15m candle open minus 15m to first 15m candle close outside FVG zone',
        });
        zone.completed = true;
      }

      if (index < 2) {
        continue;
      }

      const first = candles[index - 2];
      const third = candles[index];
      if (first.getHigh().isLessThan(third.getLow())) {
        zones.push({
          zoneId: `${range.id}-bull-${third.getOpenTime().toMs().toString()}`,
          rangeId: range.id,
          symbol: range.symbol,
          interval: range.interval,
          direction: 'bullish',
          lowerBound: first.getHigh(),
          upperBound: third.getLow(),
          zoneStartTime: third.getOpenTime().toMs(),
          mitigatedCandleOpenTime: null,
          mitigatedCandleCloseTime: null,
          completed: false,
        });
      }
      if (first.getLow().isGreaterThan(third.getHigh())) {
        zones.push({
          zoneId: `${range.id}-bear-${third.getOpenTime().toMs().toString()}`,
          rangeId: range.id,
          symbol: range.symbol,
          interval: range.interval,
          direction: 'bearish',
          lowerBound: third.getHigh(),
          upperBound: first.getLow(),
          zoneStartTime: third.getOpenTime().toMs(),
          mitigatedCandleOpenTime: null,
          mitigatedCandleCloseTime: null,
          completed: false,
        });
      }
    }

    return windows;
  }
}
