import { Inject, Injectable } from '@nestjs/common';
import {
  IN_PLAY_RUN_REPOSITORY_TOKEN,
  type IInPlayRunRepository,
} from 'src/backtesting/domain/interfaces/in-play-run-repository.interface';
import { ImportBinanceDataUseCase } from 'src/backtesting/application/use-cases/import-binance-data.use-case';
import { PrefetchInPlay1mRequestDto } from 'src/backtesting/interfaces/dtos/prefetch-in-play-1m-request.dto';
import { PrefetchInPlay1mResponseDto } from 'src/backtesting/interfaces/dtos/prefetch-in-play-1m-response.dto';

type MergedWindow = { fromTime: bigint; toTime: bigint };

@Injectable()
export class PrefetchInPlay1mUseCase {
  constructor(
    @Inject(IN_PLAY_RUN_REPOSITORY_TOKEN)
    private readonly inPlayRepository: IInPlayRunRepository,
    private readonly importBinanceDataUseCase: ImportBinanceDataUseCase,
  ) {}

  public async execute(
    runId: string,
    request: PrefetchInPlay1mRequestDto,
  ): Promise<PrefetchInPlay1mResponseDto | null> {
    const symbol = request.symbol?.toUpperCase();
    const windows = await this.inPlayRepository.listEntryWindows(runId, symbol);
    if (!windows) {
      return null;
    }

    const bySymbol = new Map<string, MergedWindow[]>();
    for (const window of windows) {
      const arr = bySymbol.get(window.symbol) ?? [];
      arr.push({
        fromTime: BigInt(window.fromTime),
        toTime: BigInt(window.toTime),
      });
      bySymbol.set(window.symbol, arr);
    }

    const jobs: PrefetchInPlay1mResponseDto['jobs'] = [];
    for (const [currentSymbol, symbolWindows] of bySymbol.entries()) {
      const merged = this.mergeWindows(symbolWindows);
      if (merged.length === 0) {
        continue;
      }
      const fromTime = merged[0].fromTime;
      const toTime = merged[merged.length - 1].toTime;

      const fromDate = new Date(Number(fromTime)).toISOString();
      const toDate = new Date(Number(toTime)).toISOString();
      const response = await this.importBinanceDataUseCase.execute({
        symbol: currentSymbol,
        interval: '1m',
        startDate: fromDate,
        endDate: toDate,
        overwrite: request.overwrite ?? false,
      });
      jobs.push({
        symbol: currentSymbol,
        fromTime: fromTime.toString(),
        toTime: toTime.toString(),
        fromDate,
        toDate,
        jobId: response.jobId,
        status: response.status,
        filesQueued: response.filesQueued,
        downloadedCount: response.downloadedCount,
        queuedPosition: response.queuedPosition,
      });
    }

    return {
      runId,
      interval: '1m',
      symbols: jobs.length,
      jobs,
    };
  }

  private mergeWindows(windows: MergedWindow[]): MergedWindow[] {
    if (windows.length === 0) {
      return [];
    }
    const sorted = [...windows].sort((a, b) => {
      if (a.fromTime < b.fromTime) return -1;
      if (a.fromTime > b.fromTime) return 1;
      if (a.toTime < b.toTime) return -1;
      if (a.toTime > b.toTime) return 1;
      return 0;
    });

    const merged: MergedWindow[] = [{ ...sorted[0] }];
    for (let index = 1; index < sorted.length; index += 1) {
      const current = sorted[index];
      const last = merged[merged.length - 1];
      if (current.fromTime <= last.toTime) {
        if (current.toTime > last.toTime) {
          last.toTime = current.toTime;
        }
        continue;
      }
      merged.push({ ...current });
    }
    return merged;
  }
}

