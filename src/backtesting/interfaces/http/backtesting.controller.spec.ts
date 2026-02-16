import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ImportBinanceDataRequestDto } from '../dtos/import-binance-data-request.dto';
import { BacktestingController } from './backtesting.controller';

type UseCaseMocks = {
  importUseCaseMock: { execute: jest.Mock };
  getStatusUseCaseMock: { execute: jest.Mock };
  getQueueOverviewUseCaseMock: { execute: jest.Mock };
  runBacktestUseCaseMock: { execute: jest.Mock };
  getBacktestRunUseCaseMock: { execute: jest.Mock };
  listBacktestRunsUseCaseMock: { execute: jest.Mock };
};

function makeController(overrides?: Partial<UseCaseMocks>) {
  const mocks: UseCaseMocks = {
    importUseCaseMock: { execute: jest.fn() },
    getStatusUseCaseMock: { execute: jest.fn() },
    getQueueOverviewUseCaseMock: { execute: jest.fn() },
    runBacktestUseCaseMock: { execute: jest.fn() },
    getBacktestRunUseCaseMock: { execute: jest.fn() },
    listBacktestRunsUseCaseMock: { execute: jest.fn() },
    ...overrides,
  };

  const controller = new BacktestingController(
    mocks.importUseCaseMock as any,
    mocks.getStatusUseCaseMock as any,
    mocks.getQueueOverviewUseCaseMock as any,
    mocks.runBacktestUseCaseMock as any,
    mocks.getBacktestRunUseCaseMock as any,
    mocks.listBacktestRunsUseCaseMock as any,
  );

  return { controller, mocks };
}

describe('BacktestingController', () => {
  it('importBinanceData delegates to use-case and returns job response', async () => {
    const { controller, mocks } = makeController({
      importUseCaseMock: {
        execute: jest.fn().mockResolvedValue({
          jobId: 'job-1',
          status: 'pending',
          filesQueued: 3,
          downloadedCount: 0,
          queuedPosition: 1,
        }),
      },
    });

    const dto: ImportBinanceDataRequestDto = {
      symbol: 'BTCUSDT',
      interval: '1m',
      startDate: '2024-01-01T00:00:00.000Z',
      endDate: '2024-01-31T23:59:59.999Z',
      overwrite: false,
    };

    const result = await controller.importBinanceData(dto);

    expect(mocks.importUseCaseMock.execute).toHaveBeenCalledWith(dto);
    expect(result).toEqual({
      jobId: 'job-1',
      status: 'pending',
      filesQueued: 3,
      downloadedCount: 0,
      queuedPosition: 1,
    });
  });

  it('getImportJobStatus returns job status when found', async () => {
    const { controller, mocks } = makeController({
      getStatusUseCaseMock: {
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
      },
    });

    const result = await controller.getImportJobStatus('job-1');

    expect(mocks.getStatusUseCaseMock.execute).toHaveBeenCalledWith('job-1');
    expect(result).toHaveProperty('jobId', 'job-1');
    expect(result).toHaveProperty('status', 'downloading');
  });

  it('getImportJobStatus throws NotFoundException when missing', async () => {
    const { controller } = makeController({
      getStatusUseCaseMock: { execute: jest.fn().mockResolvedValue(null) },
    });

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
      const { controller } = makeController({
        importUseCaseMock: {
          execute: jest.fn().mockRejectedValue(new Error(message)),
        },
      });

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
    const { controller, mocks } = makeController({
      getQueueOverviewUseCaseMock: {
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
      },
    });

    const result = controller.getImportQueueOverview();

    expect(mocks.getQueueOverviewUseCaseMock.execute).toHaveBeenCalled();
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
    const { controller, mocks } = makeController({
      runBacktestUseCaseMock: {
        execute: jest.fn().mockResolvedValue({
          runId: 'run-1',
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
      },
    });

    const result = await controller.runBacktest({
      symbol: 'BTCUSDT',
      startDate: '2024-01-01T00:00:00.000Z',
      endDate: '2024-01-31T23:59:59.999Z',
      fromInterval: '1m',
      toInterval: '15m',
    });

    expect(mocks.runBacktestUseCaseMock.execute).toHaveBeenCalled();
    expect(result).toHaveProperty('runId', 'run-1');
    expect(result).toHaveProperty('symbol', 'BTCUSDT');
    expect(result).toHaveProperty('metrics.totalTrades', 2);
  });

  it('getBacktestRun returns persisted run payload when found', async () => {
    const { controller, mocks } = makeController({
      getBacktestRunUseCaseMock: {
        execute: jest.fn().mockResolvedValue({
          id: 'run-1',
          symbol: 'BTCUSDT',
          interval: '15m',
          strategyVersion: 'fvg-bos-v1',
          config: { fromInterval: '1m', toInterval: '15m' },
          startTime: '1704067200000',
          endTime: '1706745599000',
          totalTrades: 2,
          winningTrades: 1,
          losingTrades: 1,
          winRate: 50,
          totalPnL: '12.30',
          maxDrawdown: '8.00',
          sharpeRatio: 0.55,
          profitFactor: 1.97,
          avgWin: '25.00',
          avgLoss: '-12.70',
          createdAt: new Date('2024-02-01T00:00:00.000Z'),
          trades: [],
        }),
      },
    });

    const result = await controller.getBacktestRun('run-1');

    expect(mocks.getBacktestRunUseCaseMock.execute).toHaveBeenCalledWith('run-1');
    expect(result).toHaveProperty('id', 'run-1');
    expect(result).toHaveProperty('symbol', 'BTCUSDT');
  });

  it('getBacktestRun throws NotFoundException when run missing', async () => {
    const { controller } = makeController({
      getBacktestRunUseCaseMock: { execute: jest.fn().mockResolvedValue(null) },
    });

    await expect(controller.getBacktestRun('missing-run')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('listBacktestRuns delegates filters and pagination to use-case', async () => {
    const { controller, mocks } = makeController({
      listBacktestRunsUseCaseMock: {
        execute: jest.fn().mockResolvedValue({
          items: [
            {
              id: 'run-2',
              symbol: 'ETHUSDT',
              interval: '15m',
              strategyVersion: 'fvg-bos-v1',
              startTime: '1704067200000',
              endTime: '1706745599000',
              totalTrades: 3,
              winRate: 66.67,
              totalPnL: '25.10',
              createdAt: new Date('2024-02-01T00:00:00.000Z'),
            },
          ],
          page: 2,
          limit: 10,
          total: 25,
        }),
      },
    });

    const query = {
      symbol: 'ETHUSDT',
      interval: '15m',
      sortBy: 'winRate' as const,
      sortOrder: 'asc' as const,
      page: 2,
      limit: 10,
    };

    const result = await controller.listBacktestRuns(query);

    expect(mocks.listBacktestRunsUseCaseMock.execute).toHaveBeenCalledWith(query);
    expect(result).toHaveProperty('total', 25);
    expect(result.items[0]).toHaveProperty('symbol', 'ETHUSDT');
  });

  it('listBacktestRuns maps semantic validation errors to BadRequestException', async () => {
    const { controller } = makeController({
      listBacktestRunsUseCaseMock: {
        execute: jest
          .fn()
          .mockRejectedValue(new Error('fromDate must be before or equal to toDate')),
      },
    });

    await expect(
      controller.listBacktestRuns({
        fromDate: '2024-02-01T00:00:00.000Z',
        toDate: '2024-01-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
