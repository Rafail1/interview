import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ImportBinanceDataRequestDto } from '../dtos/import-binance-data-request.dto';
import { BacktestingController } from './backtesting.controller';

type UseCaseMocks = {
  importUseCaseMock: { execute: jest.Mock };
  getStatusUseCaseMock: { execute: jest.Mock };
  getQueueOverviewUseCaseMock: { execute: jest.Mock };
  runBacktestUseCaseMock: { execute: jest.Mock };
  cancelBacktestRunUseCaseMock: { execute: jest.Mock };
  getBacktestRunUseCaseMock: { execute: jest.Mock };
  getBacktestRunProgressUseCaseMock: { execute: jest.Mock };
  getBacktestRunSummaryUseCaseMock: { execute: jest.Mock };
  getBacktestRunSignalsUseCaseMock: { execute: jest.Mock };
  getBacktestRunEquityUseCaseMock: { execute: jest.Mock };
  getBacktestRunFvgZonesUseCaseMock: { execute: jest.Mock };
  listBacktestRunsUseCaseMock: { execute: jest.Mock };
  listActiveBacktestRunsUseCaseMock: { execute: jest.Mock };
};

function makeController(overrides?: Partial<UseCaseMocks>) {
  const mocks: UseCaseMocks = {
    importUseCaseMock: { execute: jest.fn() },
    getStatusUseCaseMock: { execute: jest.fn() },
    getQueueOverviewUseCaseMock: { execute: jest.fn() },
    runBacktestUseCaseMock: { execute: jest.fn() },
    cancelBacktestRunUseCaseMock: { execute: jest.fn() },
    getBacktestRunUseCaseMock: { execute: jest.fn() },
    getBacktestRunProgressUseCaseMock: { execute: jest.fn() },
    getBacktestRunSummaryUseCaseMock: { execute: jest.fn() },
    getBacktestRunSignalsUseCaseMock: { execute: jest.fn() },
    getBacktestRunEquityUseCaseMock: { execute: jest.fn() },
    getBacktestRunFvgZonesUseCaseMock: { execute: jest.fn() },
    listBacktestRunsUseCaseMock: { execute: jest.fn() },
    listActiveBacktestRunsUseCaseMock: { execute: jest.fn() },
    ...overrides,
  };

  const controller = new BacktestingController(
    mocks.importUseCaseMock as any,
    mocks.getStatusUseCaseMock as any,
    mocks.getQueueOverviewUseCaseMock as any,
    mocks.runBacktestUseCaseMock as any,
    mocks.cancelBacktestRunUseCaseMock as any,
    mocks.getBacktestRunUseCaseMock as any,
    mocks.getBacktestRunProgressUseCaseMock as any,
    mocks.getBacktestRunSummaryUseCaseMock as any,
    mocks.getBacktestRunSignalsUseCaseMock as any,
    mocks.getBacktestRunEquityUseCaseMock as any,
    mocks.getBacktestRunFvgZonesUseCaseMock as any,
    mocks.listBacktestRunsUseCaseMock as any,
    mocks.listActiveBacktestRunsUseCaseMock as any,
  );

  return { controller, mocks };
}

describe('BacktestingController', () => {
  it('getHealth returns module health payload', () => {
    const { controller } = makeController();

    const result = controller.getHealth();

    expect(result).toHaveProperty('status', 'ok');
    expect(result).toHaveProperty('service', 'backtesting');
    expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');
  });

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
          status: 'completed',
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
    expect(result).toHaveProperty('status', 'completed');
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
          status: 'completed',
          errorMessage: null,
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
          signalsCount: 4,
          equityPointsCount: 3,
          createdAt: new Date('2024-02-01T00:00:00.000Z'),
          trades: [],
        }),
      },
    });

    const result = await controller.getBacktestRun('run-1');

    expect(mocks.getBacktestRunUseCaseMock.execute).toHaveBeenCalledWith('run-1');
    expect(result).toHaveProperty('id', 'run-1');
    expect(result).toHaveProperty('symbol', 'BTCUSDT');
    expect(result).toHaveProperty('status', 'completed');
    expect(result).toHaveProperty('signalsCount', 4);
    expect(result).toHaveProperty('equityPointsCount', 3);
  });

  it('getBacktestRunProgress returns progress payload when found', async () => {
    const { controller, mocks } = makeController({
      getBacktestRunProgressUseCaseMock: {
        execute: jest.fn().mockResolvedValue({
          runId: 'run-1',
          status: 'running',
          errorMessage: null,
          processedCandles: 1234,
          generatedSignals: 88,
          startTime: '1704067200000',
          endTime: '1706745599000',
          cancelRequestedAt: null,
          createdAt: new Date('2024-02-01T00:00:00.000Z'),
          updatedAt: new Date('2024-02-01T00:05:00.000Z'),
        }),
      },
    });

    const result = await controller.getBacktestRunProgress('run-1');

    expect(mocks.getBacktestRunProgressUseCaseMock.execute).toHaveBeenCalledWith(
      'run-1',
    );
    expect(result).toHaveProperty('runId', 'run-1');
    expect(result).toHaveProperty('status', 'running');
    expect(result).toHaveProperty('processedCandles', 1234);
  });

  it('getBacktestRunProgress throws NotFoundException when run missing', async () => {
    const { controller } = makeController({
      getBacktestRunProgressUseCaseMock: {
        execute: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(controller.getBacktestRunProgress('missing-run')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('cancelBacktestRun delegates to use-case and returns status', async () => {
    const { controller, mocks } = makeController({
      cancelBacktestRunUseCaseMock: {
        execute: jest.fn().mockResolvedValue({
          runId: 'run-1',
          status: 'cancelled',
        }),
      },
    });

    const result = await controller.cancelBacktestRun('run-1');

    expect(mocks.cancelBacktestRunUseCaseMock.execute).toHaveBeenCalledWith(
      'run-1',
    );
    expect(result).toEqual({
      runId: 'run-1',
      status: 'cancelled',
    });
  });

  it('cancelBacktestRun throws NotFoundException when run missing', async () => {
    const { controller } = makeController({
      cancelBacktestRunUseCaseMock: {
        execute: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(controller.cancelBacktestRun('missing-run')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('getBacktestRun throws NotFoundException when run missing', async () => {
    const { controller } = makeController({
      getBacktestRunUseCaseMock: { execute: jest.fn().mockResolvedValue(null) },
    });

    await expect(controller.getBacktestRun('missing-run')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('getBacktestRunSummary returns compact summary when found', async () => {
    const { controller, mocks } = makeController({
      getBacktestRunSummaryUseCaseMock: {
        execute: jest.fn().mockResolvedValue({
          id: 'run-1',
          symbol: 'BTCUSDT',
          interval: '15m',
          strategyVersion: 'fvg-bos-v1',
          status: 'completed',
          errorMessage: null,
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
          signalsCount: 4,
          equityPointsCount: 3,
          lastEquity: '10012.30',
          lastDrawdown: '2.50',
          createdAt: new Date('2024-02-01T00:00:00.000Z'),
        }),
      },
    });

    const result = await controller.getBacktestRunSummary('run-1');

    expect(mocks.getBacktestRunSummaryUseCaseMock.execute).toHaveBeenCalledWith(
      'run-1',
    );
    expect(result).toHaveProperty('id', 'run-1');
    expect(result).toHaveProperty('status', 'completed');
    expect(result).toHaveProperty('lastEquity', '10012.30');
  });

  it('getBacktestRunSummary throws NotFoundException when run missing', async () => {
    const { controller } = makeController({
      getBacktestRunSummaryUseCaseMock: {
        execute: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      controller.getBacktestRunSummary('missing-run'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getBacktestRunSignals returns persisted signals when found', async () => {
    const { controller, mocks } = makeController({
      getBacktestRunSignalsUseCaseMock: {
        execute: jest.fn().mockResolvedValue({
          items: [
            {
              id: 'sig-1',
              timestamp: '1704067200000',
              signalType: 'BUY',
              reason: 'fvg_bos_confluence',
              price: '42250.10',
              metadata: { foo: 'bar' },
              createdAt: new Date('2024-02-01T00:00:00.000Z'),
            },
          ],
          limit: 100,
          total: 1,
          nextCursor: null,
        }),
      },
    });

    const query = { limit: 100 };
    const result = await controller.getBacktestRunSignals('run-1', query);

    expect(mocks.getBacktestRunSignalsUseCaseMock.execute).toHaveBeenCalledWith(
      'run-1',
      query,
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toHaveProperty('signalType', 'BUY');
  });

  it('getBacktestRunSignals throws NotFoundException when run missing', async () => {
    const { controller } = makeController({
      getBacktestRunSignalsUseCaseMock: {
        execute: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      controller.getBacktestRunSignals('missing-run', {}),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getBacktestRunEquity returns persisted equity points when found', async () => {
    const { controller, mocks } = makeController({
      getBacktestRunEquityUseCaseMock: {
        execute: jest.fn().mockResolvedValue({
          items: [
            {
              id: 'eq-1',
              timestamp: '1704067200000',
              equity: '10000',
              drawdown: '0',
              createdAt: new Date('2024-02-01T00:00:00.000Z'),
            },
          ],
          limit: 100,
          total: 1,
          nextCursor: null,
        }),
      },
    });

    const query = { limit: 100 };
    const result = await controller.getBacktestRunEquity('run-1', query);

    expect(mocks.getBacktestRunEquityUseCaseMock.execute).toHaveBeenCalledWith(
      'run-1',
      query,
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toHaveProperty('equity', '10000');
  });

  it('getBacktestRunEquity throws NotFoundException when run missing', async () => {
    const { controller } = makeController({
      getBacktestRunEquityUseCaseMock: {
        execute: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      controller.getBacktestRunEquity('missing-run', {}),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getBacktestRunFvgZones returns reconstructed zones when run exists', async () => {
    const { controller, mocks } = makeController({
      getBacktestRunFvgZonesUseCaseMock: {
        execute: jest.fn().mockResolvedValue({
          items: [
            {
              id: 'fvg-bull-1704069000000',
              direction: 'bullish',
              lowerBound: '100',
              upperBound: '101',
              startTime: '1704069000000',
              endTime: '1704069600000',
              description:
                'opened position because signal bullish_bos_after_fvg_touch_entry was executed',
            },
          ],
          total: 1,
        }),
      },
    });

    const result = await controller.getBacktestRunFvgZones('run-1');

    expect(mocks.getBacktestRunFvgZonesUseCaseMock.execute).toHaveBeenCalledWith(
      'run-1',
    );
    expect(result.total).toBe(1);
    expect(result.items[0]).toHaveProperty('id', 'fvg-bull-1704069000000');
  });

  it('getBacktestRunFvgZones throws NotFoundException when run missing', async () => {
    const { controller } = makeController({
      getBacktestRunFvgZonesUseCaseMock: {
        execute: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(controller.getBacktestRunFvgZones('missing-run')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('series endpoints map fromTs/toTs semantic validation to BadRequestException', async () => {
    const error = new Error('fromTs must be before or equal to toTs');
    const { controller } = makeController({
      getBacktestRunSignalsUseCaseMock: {
        execute: jest.fn().mockRejectedValue(error),
      },
      getBacktestRunEquityUseCaseMock: {
        execute: jest.fn().mockRejectedValue(error),
      },
    });

    await expect(
      controller.getBacktestRunSignals('run-1', {
        fromTs: '200',
        toTs: '100',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      controller.getBacktestRunEquity('run-1', {
        fromTs: '200',
        toTs: '100',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
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
              status: 'completed',
              errorMessage: null,
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

  it('listActiveBacktestRuns returns active run list', async () => {
    const { controller, mocks } = makeController({
      listActiveBacktestRunsUseCaseMock: {
        execute: jest.fn().mockResolvedValue({
          items: [
            {
              id: 'run-active-1',
              symbol: 'BTCUSDT',
              interval: '15m',
              strategyVersion: 'fvg-bos-v1',
              status: 'running',
              processedCandles: 1234,
              generatedSignals: 56,
              startTime: '1704067200000',
              endTime: '1706745599000',
              createdAt: new Date('2024-02-01T00:00:00.000Z'),
              updatedAt: new Date('2024-02-01T00:05:00.000Z'),
              cancelRequestedAt: null,
            },
          ],
        }),
      },
    });

    const result = await controller.listActiveBacktestRuns();

    expect(mocks.listActiveBacktestRunsUseCaseMock.execute).toHaveBeenCalled();
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toHaveProperty('status', 'running');
    expect(result.items[0]).toHaveProperty('processedCandles', 1234);
  });
});
