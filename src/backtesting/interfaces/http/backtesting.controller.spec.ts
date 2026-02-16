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
    const runBacktestUseCaseMock = { execute: jest.fn() } as any;

    const controller = new BacktestingController(
      importUseCaseMock,
      getStatusUseCaseMock,
      getQueueOverviewUseCaseMock,
      runBacktestUseCaseMock,
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
    const runBacktestUseCaseMock = { execute: jest.fn() } as any;

    const controller = new BacktestingController(
      importUseCaseMock,
      getStatusUseCaseMock,
      getQueueOverviewUseCaseMock,
      runBacktestUseCaseMock,
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
    const runBacktestUseCaseMock = { execute: jest.fn() } as any;

    const controller = new BacktestingController(
      importUseCaseMock,
      getStatusUseCaseMock,
      getQueueOverviewUseCaseMock,
      runBacktestUseCaseMock,
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
      const runBacktestUseCaseMock = { execute: jest.fn() } as any;

      const controller = new BacktestingController(
        importUseCaseMock,
        getStatusUseCaseMock,
        getQueueOverviewUseCaseMock,
        runBacktestUseCaseMock,
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
    const runBacktestUseCaseMock = { execute: jest.fn() } as any;

    const controller = new BacktestingController(
      importUseCaseMock,
      getStatusUseCaseMock,
      getQueueOverviewUseCaseMock,
      runBacktestUseCaseMock,
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

  it('runBacktest delegates to use-case and returns summary', async () => {
    const importUseCaseMock = { execute: jest.fn() } as any;
    const getStatusUseCaseMock = { execute: jest.fn() } as any;
    const getQueueOverviewUseCaseMock = { execute: jest.fn() } as any;
    const runBacktestUseCaseMock = {
      execute: jest.fn().mockResolvedValue({
        symbol: 'BTCUSDT',
        fromInterval: '1m',
        toInterval: '15m',
        processedCandles: 100,
        generatedSignals: 4,
        metrics: {
          totalTrades: 2,
          winningTrades: 1,
          losingTrades: 1,
          drawTrades: 0,
          winRate: '50.00',
          totalPnL: '12.30',
          roi: '0.12',
          avgWin: '25.00',
          avgLoss: '-12.70',
          profitFactor: '1.97',
          maxDrawdown: '8.00',
          drawdownPercent: '0.08',
          expectancy: '6.15',
          sharpeRatio: '0.55',
        },
      }),
    } as any;

    const controller = new BacktestingController(
      importUseCaseMock,
      getStatusUseCaseMock,
      getQueueOverviewUseCaseMock,
      runBacktestUseCaseMock,
    );

    const result = await controller.runBacktest({
      symbol: 'BTCUSDT',
      startDate: '2024-01-01T00:00:00.000Z',
      endDate: '2024-01-31T23:59:59.999Z',
      fromInterval: '1m',
      toInterval: '15m',
    });

    expect(runBacktestUseCaseMock.execute).toHaveBeenCalled();
    expect(result).toHaveProperty('symbol', 'BTCUSDT');
    expect(result).toHaveProperty('metrics.totalTrades', 2);
  });
});
