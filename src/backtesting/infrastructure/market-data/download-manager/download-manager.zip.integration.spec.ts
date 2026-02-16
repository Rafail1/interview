import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { ZipFile } from 'yazl';
import { IMarketDataRepository } from 'src/backtesting/domain/interfaces/market-data-repository.interface';
import { ILogger } from 'src/core/interfaces/logger.interface';
import { BinanceDataDownloader } from 'src/backtesting/infrastructure/data-loaders/binance-data.downloader';
import { DownloadJobRepository } from './download-job.repository';
import { DownloadManager } from './download-manager';

function createZipWithCsv(
  zipPath: string,
  csvFileName: string,
  csvData: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const zipFile = new ZipFile();
    zipFile.addBuffer(Buffer.from(csvData, 'utf8'), csvFileName);
    zipFile.end();

    const output = fs.createWriteStream(zipPath);
    output.on('close', () => resolve());
    output.on('error', (error) =>
      reject(error instanceof Error ? error : new Error(String(error))),
    );
    zipFile.outputStream.pipe(output);
  });
}

async function waitUntil(
  condition: () => boolean,
  timeoutMs = 4000,
  intervalMs = 25,
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timed out waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

describe('DownloadManager ZIP integration', () => {
  it('imports candles using real zip extraction + parser', async () => {
    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'download-manager-zip-int-'),
    );
    const zipPath = path.join(tempDir, 'BTCUSDT-1m-2024-01.zip');
    const csvName = 'BTCUSDT-1m-2024-01.csv';
    const csv = [
      '1704067200000,42250.10,42280.00,42210.00,42260.20,12.5,1704067259999,528250.1,120,6.2,262000.5,0',
      '1704067260000,42260.20,42300.00,42255.00,42290.10,10.0,1704067319999,422901.0,98,4.8,203000.0,0',
    ].join('\n');
    await createZipWithCsv(zipPath, csvName, csv);

    const configService = {
      get: jest.fn().mockReturnValue('1'),
    } as unknown as ConfigService;

    const downloader = {
      downloadMonthlyZip: jest.fn().mockResolvedValue(zipPath),
    } as unknown as BinanceDataDownloader;

    const downloadJobRepository = {
      create: jest.fn().mockResolvedValue('job-zip-int'),
      markDownloading: jest.fn().mockResolvedValue(undefined),
      incrementDownloaded: jest.fn().mockResolvedValue(undefined),
      incrementFailed: jest.fn().mockResolvedValue(undefined),
      markCompleted: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
    } as unknown as DownloadJobRepository;

    const marketDataRepository = {
      saveCandles: jest.fn().mockResolvedValue(undefined),
      getCandleStream: jest.fn(),
      getAggregatedStream: jest.fn(),
      hasData: jest.fn(),
    } as unknown as IMarketDataRepository;

    const logger: ILogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const manager = new DownloadManager(
      configService,
      downloader,
      downloadJobRepository,
      marketDataRepository,
      logger,
    );

    const result = await manager.startImport({
      symbol: 'BTCUSDT',
      interval: '1m',
      startDate: new Date('2024-01-01T00:00:00.000Z'),
      endDate: new Date('2024-01-31T23:59:59.999Z'),
      overwrite: false,
    });

    expect(result.jobId).toBe('job-zip-int');

    await waitUntil(() =>
      (downloadJobRepository.markCompleted as jest.Mock).mock.calls.length > 0,
    );

    expect(marketDataRepository.saveCandles).toHaveBeenCalledTimes(1);
    const savedCandles = (marketDataRepository.saveCandles as jest.Mock).mock
      .calls[0][0];
    expect(savedCandles).toHaveLength(2);
    expect(savedCandles[0].getSymbol()).toBe('BTCUSDT');
    expect(savedCandles[0].getOpen().toString()).toBe('42250.1');
    expect(savedCandles[1].getClose().toString()).toBe('42290.1');
    expect(downloadJobRepository.incrementDownloaded).toHaveBeenCalledWith(
      'job-zip-int',
      1704067319999n,
    );

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('marks job as failed when CSV parsing fails', async () => {
    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'download-manager-zip-fail-int-'),
    );
    const zipPath = path.join(tempDir, 'BTCUSDT-1m-2024-01.zip');
    const csvName = 'BTCUSDT-1m-2024-01.csv';
    const malformedCsv = 'invalid_row_without_required_columns';
    await createZipWithCsv(zipPath, csvName, malformedCsv);

    const configService = {
      get: jest.fn().mockReturnValue('1'),
    } as unknown as ConfigService;

    const downloader = {
      downloadMonthlyZip: jest.fn().mockResolvedValue(zipPath),
    } as unknown as BinanceDataDownloader;

    const downloadJobRepository = {
      create: jest.fn().mockResolvedValue('job-zip-fail'),
      markDownloading: jest.fn().mockResolvedValue(undefined),
      incrementDownloaded: jest.fn().mockResolvedValue(undefined),
      incrementFailed: jest.fn().mockResolvedValue(undefined),
      markCompleted: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
    } as unknown as DownloadJobRepository;

    const marketDataRepository = {
      saveCandles: jest.fn().mockResolvedValue(undefined),
      getCandleStream: jest.fn(),
      getAggregatedStream: jest.fn(),
      hasData: jest.fn(),
    } as unknown as IMarketDataRepository;

    const logger: ILogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const manager = new DownloadManager(
      configService,
      downloader,
      downloadJobRepository,
      marketDataRepository,
      logger,
    );

    const result = await manager.startImport({
      symbol: 'BTCUSDT',
      interval: '1m',
      startDate: new Date('2024-01-01T00:00:00.000Z'),
      endDate: new Date('2024-01-31T23:59:59.999Z'),
      overwrite: false,
    });

    expect(result.jobId).toBe('job-zip-fail');

    await waitUntil(
      () => (downloadJobRepository.markFailed as jest.Mock).mock.calls.length > 0,
    );

    expect(downloadJobRepository.incrementFailed).toHaveBeenCalledWith(
      'job-zip-fail',
    );
    expect(downloadJobRepository.markFailed).toHaveBeenCalledWith(
      'job-zip-fail',
      expect.stringContaining('Failed to parse Binance kline at line'),
    );
    expect(downloadJobRepository.markCompleted).not.toHaveBeenCalled();
    expect(marketDataRepository.saveCandles).not.toHaveBeenCalled();

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('marks job as failed when zip has no csv entry', async () => {
    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'download-manager-zip-no-csv-int-'),
    );
    const zipPath = path.join(tempDir, 'BTCUSDT-1m-2024-01.zip');
    await createZipWithCsv(zipPath, 'README.txt', 'not a csv payload');

    const configService = {
      get: jest.fn().mockReturnValue('1'),
    } as unknown as ConfigService;

    const downloader = {
      downloadMonthlyZip: jest.fn().mockResolvedValue(zipPath),
    } as unknown as BinanceDataDownloader;

    const downloadJobRepository = {
      create: jest.fn().mockResolvedValue('job-zip-no-csv'),
      markDownloading: jest.fn().mockResolvedValue(undefined),
      incrementDownloaded: jest.fn().mockResolvedValue(undefined),
      incrementFailed: jest.fn().mockResolvedValue(undefined),
      markCompleted: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
    } as unknown as DownloadJobRepository;

    const marketDataRepository = {
      saveCandles: jest.fn().mockResolvedValue(undefined),
      getCandleStream: jest.fn(),
      getAggregatedStream: jest.fn(),
      hasData: jest.fn(),
    } as unknown as IMarketDataRepository;

    const logger: ILogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const manager = new DownloadManager(
      configService,
      downloader,
      downloadJobRepository,
      marketDataRepository,
      logger,
    );

    const result = await manager.startImport({
      symbol: 'BTCUSDT',
      interval: '1m',
      startDate: new Date('2024-01-01T00:00:00.000Z'),
      endDate: new Date('2024-01-31T23:59:59.999Z'),
      overwrite: false,
    });

    expect(result.jobId).toBe('job-zip-no-csv');

    await waitUntil(
      () => (downloadJobRepository.markFailed as jest.Mock).mock.calls.length > 0,
    );

    expect(downloadJobRepository.incrementFailed).toHaveBeenCalledWith(
      'job-zip-no-csv',
    );
    expect(downloadJobRepository.markFailed).toHaveBeenCalledWith(
      'job-zip-no-csv',
      expect.stringContaining('No CSV file found in ZIP archive'),
    );
    expect(downloadJobRepository.markCompleted).not.toHaveBeenCalled();
    expect(marketDataRepository.saveCandles).not.toHaveBeenCalled();

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
