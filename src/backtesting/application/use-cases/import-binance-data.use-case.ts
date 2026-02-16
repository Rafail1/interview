import { Inject, Injectable } from '@nestjs/common';
import {
  DOWNLOAD_MANAGER_TOKEN,
  type IDownloadManager,
} from 'src/backtesting/domain/interfaces/download-manager.interface';
import {
  MARKET_DATA_REPOSITORY_TOKEN,
  type IMarketDataRepository,
} from 'src/backtesting/domain/interfaces/market-data-repository.interface';
import { Timeframe } from 'src/backtesting/domain/value-objects/timeframe.value-object';
import { Timestamp } from 'src/backtesting/domain/value-objects/timestamp.value-object';
import {
  LOGGER_TOKEN,
  type ILogger,
} from 'src/core/interfaces/logger.interface';
import { ImportBinanceDataRequestDto } from 'src/backtesting/interfaces/dtos/import-binance-data-request.dto';

@Injectable()
export class ImportBinanceDataUseCase {
  constructor(
    @Inject(DOWNLOAD_MANAGER_TOKEN)
    private readonly downloadManager: IDownloadManager,
    @Inject(MARKET_DATA_REPOSITORY_TOKEN)
    private readonly marketDataRepository: IMarketDataRepository,
    @Inject(LOGGER_TOKEN) private readonly logger: ILogger,
  ) {}

  public async execute(command: ImportBinanceDataRequestDto) {
    const startDate = new Date(command.startDate);
    const endDate = new Date(command.endDate);
    this.validateDateRange(startDate, endDate);
    Timeframe.from(command.interval);

    const start = Timestamp.fromMs(startDate.getTime());
    const end = Timestamp.fromMs(endDate.getTime());
    const dataAlreadyExists = await this.marketDataRepository.hasData(
      command.symbol,
      command.interval,
      start,
      end,
    );

    if (dataAlreadyExists && !command.overwrite) {
      this.logger.log(
        `Skipping import: ${command.symbol} ${command.interval} already exists for requested range`,
        ImportBinanceDataUseCase.name,
      );
      return {
        jobId: 'already-imported',
        status: 'completed' as const,
        filesQueued: 0,
        downloadedCount: 0,
        queuedPosition: null,
      };
    }

    return this.downloadManager.startImport({
      symbol: command.symbol,
      interval: command.interval,
      startDate,
      endDate,
      overwrite: command.overwrite,
    });
  }

  private validateDateRange(startDate: Date, endDate: Date): void {
    const now = new Date();
    if (startDate > endDate) {
      throw new Error('startDate must be before or equal to endDate');
    }
    if (startDate > now || endDate > now) {
      throw new Error('Date range cannot be in the future');
    }
  }
}
