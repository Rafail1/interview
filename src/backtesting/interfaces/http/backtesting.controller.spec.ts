import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BacktestingController } from './backtesting.controller';
import { ImportBinanceDataRequestDto } from '../dtos/import-binance-data-request.dto';

describe('BacktestingController', () => {
  it('importBinanceData delegates to use-case and returns job response', async () => {
    const importUseCaseMock = {
      execute: jest.fn().mockResolvedValue({
        jobId: 'job-1',
        status: 'pending',
        filesQueued: 3,
        downloadedCount: 0,
        queuedPosition: 1,
      }),
    } as any;
    const getStatusUseCaseMock = { execute: jest.fn() } as any;
    const getQueueOverviewUseCaseMock = { execute: jest.fn() } as any;

    const controller = new BacktestingController(
      importUseCaseMock,
      getStatusUseCaseMock,
      getQueueOverviewUseCaseMock,
    );

    const dto: ImportBinanceDataRequestDto = {
      symbol: 'BTCUSDT',
      interval: '1m',
      startDate: '2024-01-01T00:00:00.000Z',
      endDate: '2024-01-31T23:59:59.999Z',
      overwrite: false,
    };

    const result = await controller.importBinanceData(dto);

    expect(importUseCaseMock.execute).toHaveBeenCalledWith(dto);
    expect(result).toEqual({
      jobId: 'job-1',
      status: 'pending',
      filesQueued: 3,
      downloadedCount: 0,
      queuedPosition: 1,
    });
  });

  it('getImportJobStatus returns job status when found', async () => {
    const importUseCaseMock = { execute: jest.fn() } as any;
    const getStatusUseCaseMock = {
      execute: jest.fn().mockResolvedValue({
        jobId: 'job-1',
        status: 'downloading',
        queuedPosition: null,
        queueSize: 0,
        isQueued: false,
        activeImports: 1,
        maxConcurrentImports: 2,
        symbol: 'BTCUSDT',
        interval: '1m',
        totalFiles: 2,
        downloadedFiles: 1,
        failedFiles: 0,
        checksumValid: true,
        errorMessage: null,
        lastSuccessfulTime: '1700000059999',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:10:00.000Z'),
      }),
    } as any;
    const getQueueOverviewUseCaseMock = { execute: jest.fn() } as any;

    const controller = new BacktestingController(
      importUseCaseMock,
      getStatusUseCaseMock,
      getQueueOverviewUseCaseMock,
    );

    const result = await controller.getImportJobStatus('job-1');

    expect(getStatusUseCaseMock.execute).toHaveBeenCalledWith('job-1');
    expect(result).toHaveProperty('jobId', 'job-1');
    expect(result).toHaveProperty('status', 'downloading');
  });

  it('getImportJobStatus throws NotFoundException when missing', async () => {
    const importUseCaseMock = { execute: jest.fn() } as any;
    const getStatusUseCaseMock = {
      execute: jest.fn().mockResolvedValue(null),
    } as any;
    const getQueueOverviewUseCaseMock = { execute: jest.fn() } as any;

    const controller = new BacktestingController(
      importUseCaseMock,
      getStatusUseCaseMock,
      getQueueOverviewUseCaseMock,
    );

    await expect(controller.getImportJobStatus('missing-job')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it.each([
    'startDate must be before or equal to endDate',
    'Date range cannot be in the future',
    'Invalid timeframe: 7m',
  ])(
    'importBinanceData maps semantic validation error "%s" to BadRequestException',
    async (message) => {
      const importUseCaseMock = {
        execute: jest.fn().mockRejectedValue(new Error(message)),
      } as any;
      const getStatusUseCaseMock = { execute: jest.fn() } as any;
      const getQueueOverviewUseCaseMock = { execute: jest.fn() } as any;

      const controller = new BacktestingController(
        importUseCaseMock,
        getStatusUseCaseMock,
        getQueueOverviewUseCaseMock,
      );

      const dto: ImportBinanceDataRequestDto = {
        symbol: 'BTCUSDT',
        interval: '1m',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-31T23:59:59.999Z',
        overwrite: false,
      };

      await expect(controller.importBinanceData(dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    },
  );

  it('getImportQueueOverview returns live queue summary', () => {
    const importUseCaseMock = { execute: jest.fn() } as any;
    const getStatusUseCaseMock = { execute: jest.fn() } as any;
    const getQueueOverviewUseCaseMock = {
      execute: jest.fn().mockReturnValue({
        queueSize: 2,
        activeImports: 1,
        maxConcurrentImports: 2,
        queuedJobs: [
          {
            jobId: 'job-2',
            symbol: 'ETHUSDT',
            interval: '1m',
            queuedPosition: 1,
          },
        ],
      }),
    } as any;

    const controller = new BacktestingController(
      importUseCaseMock,
      getStatusUseCaseMock,
      getQueueOverviewUseCaseMock,
    );

    const result = controller.getImportQueueOverview();

    expect(getQueueOverviewUseCaseMock.execute).toHaveBeenCalled();
    expect(result).toEqual({
      queueSize: 2,
      activeImports: 1,
      maxConcurrentImports: 2,
      queuedJobs: [
        {
          jobId: 'job-2',
          symbol: 'ETHUSDT',
          interval: '1m',
          queuedPosition: 1,
        },
      ],
    });
  });
});
