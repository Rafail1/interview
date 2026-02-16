import { ConfigService } from '@nestjs/config';
import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import { IMarketDataRepository } from 'src/backtesting/domain/interfaces/market-data-repository.interface';
import { OHLCV } from 'src/backtesting/domain/value-objects/ohlcv.value-object';
import { Timeframe } from 'src/backtesting/domain/value-objects/timeframe.value-object';
import { ILogger } from 'src/core/interfaces/logger.interface';
import { BinanceDataDownloader } from '../../data-loaders/binance-data.downloader';
import { BinanceKlinesParser } from '../../data-loaders/binance-klines.parser';
import { ZipExtractor } from '../zip.extractor';
import { DownloadJobRepository } from './download-job.repository';
import { DownloadManager } from './download-manager';

function makeCandle(openTimeMs: number): Candle {
  return Candle.create(
    'BTCUSDT',
    Timeframe.from('1m'),
    openTimeMs,
    openTimeMs + 59_999,
    OHLCV.from('100', '105', '95', '102', '10', '1000'),
  );
}

async function* makeStream(candles: Candle[]): AsyncGenerator<Candle> {
  for (const candle of candles) {
    yield candle;
  }
}

describe('DownloadManager', () => {
  const logger: ILogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const configService = {
    get: jest.fn().mockReturnValue('1'),
  } as unknown as ConfigService;

  const downloader = {
    downloadMonthlyZip: jest.fn(),
  } as unknown as BinanceDataDownloader;

  const downloadJobRepository = {
    create: jest.fn(),
    markDownloading: jest.fn(),
    incrementDownloaded: jest.fn(),
    incrementFailed: jest.fn(),
    markCompleted: jest.fn(),
    markFailed: jest.fn(),
    findById: jest.fn(),
  } as unknown as DownloadJobRepository;

  const marketDataRepository = {
    saveCandles: jest.fn(),
    getCandleStream: jest.fn(),
    getAggregatedStream: jest.fn(),
    hasData: jest.fn(),
  } as unknown as IMarketDataRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(ZipExtractor, 'cleanup').mockImplementation(() => undefined);
    jest.spyOn(ZipExtractor, 'extractZip').mockResolvedValue('tmp/extract/data.csv');
    jest
      .spyOn(BinanceKlinesParser, 'parseStream')
      .mockImplementation(() =>
        makeStream([makeCandle(1_700_000_000_000), makeCandle(1_700_000_060_000)]),
      );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('runs import job and persists parsed candles', async () => {
    const manager = new DownloadManager(
      configService,
      downloader,
      downloadJobRepository,
      marketDataRepository,
      logger,
    );

    (downloadJobRepository.create as jest.Mock).mockResolvedValue('job-1');
    (downloadJobRepository.markDownloading as jest.Mock).mockResolvedValue(undefined);
    (downloadJobRepository.incrementDownloaded as jest.Mock).mockResolvedValue(undefined);
    (downloadJobRepository.markCompleted as jest.Mock).mockResolvedValue(undefined);
    (downloader.downloadMonthlyZip as jest.Mock).mockResolvedValue('tmp/file.zip');
    (marketDataRepository.saveCandles as jest.Mock).mockResolvedValue(undefined);

    const result = await manager.startImport({
      symbol: 'BTCUSDT',
      interval: '1m',
      startDate: new Date('2024-01-01T00:00:00.000Z'),
      endDate: new Date('2024-01-31T23:59:59.999Z'),
      overwrite: false,
    });

    expect(result.jobId).toBe('job-1');

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(downloadJobRepository.markDownloading).toHaveBeenCalledWith('job-1');
    expect(downloader.downloadMonthlyZip).toHaveBeenCalledWith(
      'BTCUSDT',
      '1m',
      '2024-01',
    );
    expect(marketDataRepository.saveCandles).toHaveBeenCalled();
    expect(downloadJobRepository.incrementDownloaded).toHaveBeenCalledWith(
      'job-1',
      expect.any(BigInt),
    );
    expect(downloadJobRepository.markCompleted).toHaveBeenCalledWith('job-1');
  });

  it('reports queue position when another import is running', async () => {
    const manager = new DownloadManager(
      configService,
      downloader,
      downloadJobRepository,
      marketDataRepository,
      logger,
    );

    let releaseFirstDownload: (() => void) | null = null;
    const firstDownloadGate = new Promise<void>((resolve) => {
      releaseFirstDownload = resolve;
    });

    (downloadJobRepository.create as jest.Mock)
      .mockResolvedValueOnce('job-1')
      .mockResolvedValueOnce('job-2');
    (downloadJobRepository.markDownloading as jest.Mock).mockResolvedValue(undefined);
    (downloadJobRepository.incrementDownloaded as jest.Mock).mockResolvedValue(undefined);
    (downloadJobRepository.markCompleted as jest.Mock).mockResolvedValue(undefined);
    (downloader.downloadMonthlyZip as jest.Mock)
      .mockImplementationOnce(async () => {
        await firstDownloadGate;
        return 'tmp/file-1.zip';
      })
      .mockResolvedValueOnce('tmp/file-2.zip');
    (marketDataRepository.saveCandles as jest.Mock).mockResolvedValue(undefined);
    (downloadJobRepository.findById as jest.Mock).mockImplementation(async (jobId: string) => ({
      jobId,
      symbol: 'BTCUSDT',
      interval: '1m',
      status: 'pending',
      queuedPosition: null,
      totalFiles: 1,
      downloadedFiles: 0,
      failedFiles: 0,
      checksumValid: false,
      errorMessage: null,
      lastSuccessfulTime: null,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    }));

    await manager.startImport({
      symbol: 'BTCUSDT',
      interval: '1m',
      startDate: new Date('2024-01-01T00:00:00.000Z'),
      endDate: new Date('2024-01-31T23:59:59.999Z'),
      overwrite: false,
    });

    const second = await manager.startImport({
      symbol: 'ETHUSDT',
      interval: '1m',
      startDate: new Date('2024-01-01T00:00:00.000Z'),
      endDate: new Date('2024-01-31T23:59:59.999Z'),
      overwrite: false,
    });

    expect(second.jobId).toBe('job-2');
    expect(second.queuedPosition).toBe(1);

    const secondStatus = await manager.getJobStatus('job-2');
    expect(secondStatus?.queuedPosition).toBe(1);

    if (!releaseFirstDownload) {
      throw new Error('Failed to initialize first download gate');
    }
    releaseFirstDownload();
  });
});
