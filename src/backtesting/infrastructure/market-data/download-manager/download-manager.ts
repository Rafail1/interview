import { dirname } from 'path';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import {
  IDownloadManager,
  ImportBinanceJobResult,
  ImportBinanceRequest,
  ImportJobProgress,
} from 'src/backtesting/domain/interfaces/download-manager.interface';
import { MARKET_DATA_REPOSITORY_TOKEN } from 'src/backtesting/domain/interfaces/market-data-repository.interface';
import type { IMarketDataRepository } from 'src/backtesting/domain/interfaces/market-data-repository.interface';
import {
  LOGGER_TOKEN,
  type ILogger,
} from 'src/core/interfaces/logger.interface';
import { BinanceDataDownloader } from 'src/backtesting/infrastructure/data-loaders/binance-data.downloader';
import { BinanceKlinesParser } from 'src/backtesting/infrastructure/data-loaders/binance-klines.parser';
import { ZipExtractor } from 'src/backtesting/infrastructure/market-data/zip.extractor';
import { DownloadJobRepository } from 'src/backtesting/infrastructure/market-data/download-manager/download-job.repository';

type ImportQueueItem = {
  jobId: string;
  request: ImportBinanceRequest;
  yearMonths: string[];
};

@Injectable()
export class DownloadManager implements IDownloadManager {
  private readonly importQueue: ImportQueueItem[] = [];
  private activeImports = 0;
  private readonly maxConcurrentImports: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly downloader: BinanceDataDownloader,
    private readonly downloadJobRepository: DownloadJobRepository,
    @Inject(MARKET_DATA_REPOSITORY_TOKEN)
    private readonly marketDataRepository: IMarketDataRepository,
    @Inject(LOGGER_TOKEN) private readonly logger: ILogger,
  ) {
    const configuredConcurrency = Number(
      this.configService.get<string>('BINANCE_IMPORT_CONCURRENCY') ?? '2',
    );
    this.maxConcurrentImports =
      Number.isFinite(configuredConcurrency) && configuredConcurrency > 0
        ? Math.floor(configuredConcurrency)
        : 2;
  }

  public async startImport(
    request: ImportBinanceRequest,
  ): Promise<ImportBinanceJobResult> {
    const yearMonths = this.getYearMonths(request.startDate, request.endDate);
    const jobId = await this.downloadJobRepository.create(
      request.symbol,
      request.interval,
      request.startDate,
      request.endDate,
      yearMonths.length,
    );

    this.importQueue.push({ jobId, request, yearMonths });
    this.scheduleQueue();

    return {
      jobId,
      status: 'pending',
      filesQueued: yearMonths.length,
      downloadedCount: 0,
      queuedPosition: this.getQueuePosition(jobId),
    };
  }

  public async getJobStatus(jobId: string): Promise<ImportJobProgress | null> {
    const status = await this.downloadJobRepository.findById(jobId);
    if (!status) {
      return null;
    }

    return {
      ...status,
      queuedPosition: this.getQueuePosition(jobId),
    };
  }

  private scheduleQueue(): void {
    while (
      this.activeImports < this.maxConcurrentImports &&
      this.importQueue.length > 0
    ) {
      const queued = this.importQueue.shift();
      if (!queued) {
        break;
      }

      this.activeImports += 1;
      void this.executeQueuedImport(queued);
    }
  }

  private async executeQueuedImport(queueItem: ImportQueueItem): Promise<void> {
    try {
      await this.runImport(
        queueItem.jobId,
        queueItem.request,
        queueItem.yearMonths,
      );
    } finally {
      this.activeImports -= 1;
      this.scheduleQueue();
    }
  }

  private getQueuePosition(jobId: string): number | null {
    const index = this.importQueue.findIndex((item) => item.jobId === jobId);
    return index === -1 ? null : index + 1;
  }

  private async runImport(
    jobId: string,
    request: ImportBinanceRequest,
    yearMonths: string[],
  ): Promise<void> {
    await this.downloadJobRepository.markDownloading(jobId);

    try {
      for (const yearMonth of yearMonths) {
        await this.importSingleMonth(jobId, request, yearMonth);
      }

      await this.downloadJobRepository.markCompleted(jobId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Import job ${jobId} failed: ${message}`);
      await this.downloadJobRepository.markFailed(jobId, message);
    }
  }

  private async importSingleMonth(
    jobId: string,
    request: ImportBinanceRequest,
    yearMonth: string,
  ): Promise<void> {
    this.logger.log(
      `Importing ${request.symbol} ${request.interval} for ${yearMonth}`,
      DownloadManager.name,
    );

    const zipPath = await this.downloader.downloadMonthlyZip(
      request.symbol,
      request.interval,
      yearMonth,
    );
    const csvPath = await ZipExtractor.extractZip(zipPath);
    const extractedDir = dirname(csvPath);

    try {
      const candlesBatch: Candle[] = [];
      let lastSuccessfulTime: bigint | null = null;

      for await (const candle of BinanceKlinesParser.parseStream(
        csvPath,
        request.symbol,
        request.interval,
      )) {
        candlesBatch.push(candle);
        lastSuccessfulTime = candle.getCloseTime().toMs();

        if (candlesBatch.length >= 1_000) {
          await this.marketDataRepository.saveCandles(candlesBatch);
          candlesBatch.length = 0;
        }
      }

      if (candlesBatch.length > 0) {
        await this.marketDataRepository.saveCandles(candlesBatch);
      }

      await this.downloadJobRepository.incrementDownloaded(
        jobId,
        lastSuccessfulTime ?? 0n,
      );
    } catch (error) {
      await this.downloadJobRepository.incrementFailed(jobId);
      throw error;
    } finally {
      ZipExtractor.cleanup(extractedDir);
    }
  }

  private getYearMonths(startDate: Date, endDate: Date): string[] {
    const start = new Date(
      Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1),
    );
    const end = new Date(
      Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1),
    );

    const result: string[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const year = cursor.getUTCFullYear();
      const month = String(cursor.getUTCMonth() + 1).padStart(2, '0');
      result.push(`${year}-${month}`);
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }

    return result;
  }
}
