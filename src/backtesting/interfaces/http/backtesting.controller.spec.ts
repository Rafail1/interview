import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ImportBinanceDataRequestDto } from '../dtos/import-binance-data-request.dto';
import { BacktestingController } from './backtesting.controller';

type UseCaseMocks = {
  importUseCaseMock: { execute: jest.Mock };
  startCandleIngestionJobUseCaseMock: { execute: jest.Mock };
  startCandleIngestionRunnerUseCaseMock: { execute: jest.Mock };
  getCandleIngestionRunnerStatusUseCaseMock: { execute: jest.Mock };
  startInPlayRunUseCaseMock: { execute: jest.Mock };
  getInPlayRunStatusUseCaseMock: { execute: jest.Mock };
  listInPlayRangesUseCaseMock: { execute: jest.Mock };
  listInPlayFvgZonesUseCaseMock: { execute: jest.Mock };
  generateInPlayEntryWindowsUseCaseMock: { execute: jest.Mock };
  listInPlayEntryWindowsUseCaseMock: { execute: jest.Mock };
  runInPlayBacktestUseCaseMock: { execute: jest.Mock };
  getCandleIngestionJobStatusUseCaseMock: { execute: jest.Mock };
  getCandleIngestionJobDetailsUseCaseMock: { execute: jest.Mock };
  getCandleIngestionJobSymbolRunsUseCaseMock: { execute: jest.Mock };
  cancelCandleIngestionJobUseCaseMock: { execute: jest.Mock };
  listCandleIngestionJobsUseCaseMock: { execute: jest.Mock };
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
    startCandleIngestionJobUseCaseMock: { execute: jest.fn() },
    startCandleIngestionRunnerUseCaseMock: { execute: jest.fn() },
    getCandleIngestionRunnerStatusUseCaseMock: { execute: jest.fn() },
    startInPlayRunUseCaseMock: { execute: jest.fn() },
    getInPlayRunStatusUseCaseMock: { execute: jest.fn() },
    listInPlayRangesUseCaseMock: { execute: jest.fn() },
    listInPlayFvgZonesUseCaseMock: { execute: jest.fn() },
    generateInPlayEntryWindowsUseCaseMock: { execute: jest.fn() },
    listInPlayEntryWindowsUseCaseMock: { execute: jest.fn() },
    runInPlayBacktestUseCaseMock: { execute: jest.fn() },
    getCandleIngestionJobStatusUseCaseMock: { execute: jest.fn() },
    getCandleIngestionJobDetailsUseCaseMock: { execute: jest.fn() },
    getCandleIngestionJobSymbolRunsUseCaseMock: { execute: jest.fn() },
    cancelCandleIngestionJobUseCaseMock: { execute: jest.fn() },
    listCandleIngestionJobsUseCaseMock: { execute: jest.fn() },
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
    mocks.startCandleIngestionJobUseCaseMock as any,
    mocks.startCandleIngestionRunnerUseCaseMock as any,
    mocks.getCandleIngestionRunnerStatusUseCaseMock as any,
    mocks.startInPlayRunUseCaseMock as any,
    mocks.getInPlayRunStatusUseCaseMock as any,
    mocks.listInPlayRangesUseCaseMock as any,
    mocks.listInPlayFvgZonesUseCaseMock as any,
    mocks.generateInPlayEntryWindowsUseCaseMock as any,
    mocks.listInPlayEntryWindowsUseCaseMock as any,
    mocks.runInPlayBacktestUseCaseMock as any,
    mocks.getCandleIngestionJobStatusUseCaseMock as any,
    mocks.getCandleIngestionJobDetailsUseCaseMock as any,
    mocks.getCandleIngestionJobSymbolRunsUseCaseMock as any,
    mocks.cancelCandleIngestionJobUseCaseMock as any,
    mocks.listCandleIngestionJobsUseCaseMock as any,
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

  it('startCandleIngestionJob delegates and returns job envelope', async () => {
    const { controller, mocks } = makeController({
      startCandleIngestionJobUseCaseMock: {
        execute: jest.fn().mockResolvedValue({
          jobId: 'ing-1',
          status: 'pending',
          configHash: 'abc123',
        }),
      },
    });

    const command = {
      mode: 'incremental' as const,
      interval: '4h',
      backfillCandles: 1000,
    };
    const result = await controller.startCandleIngestionJob(command);

    expect(mocks.startCandleIngestionJobUseCaseMock.execute).toHaveBeenCalledWith(
      command,
    );
    expect(result).toEqual({
      jobId: 'ing-1',
      status: 'pending',
      configHash: 'abc123',
    });
  });

  it('startCandleIngestionRunner resumes pending jobs', async () => {
    const { controller, mocks } = makeController({
      startCandleIngestionRunnerUseCaseMock: {
        execute: jest.fn().mockResolvedValue({
          resumedJobs: 4,
        }),
      },
    });

    const result = await controller.startCandleIngestionRunner();
    expect(mocks.startCandleIngestionRunnerUseCaseMock.execute).toHaveBeenCalled();
    expect(result).toEqual({ resumedJobs: 4 });
  });

  it('getCandleIngestionRunnerStatus returns runner status', () => {
    const { controller, mocks } = makeController({
      getCandleIngestionRunnerStatusUseCaseMock: {
        execute: jest.fn().mockReturnValue({
          queuedJobs: 3,
          runningJobs: 1,
          maxConcurrentJobs: 1,
          maxConcurrentSymbols: 6,
          maxApiConcurrency: 8,
          apiInFlight: 2,
        }),
      },
    });

    const result = controller.getCandleIngestionRunnerStatus();
    expect(
      mocks.getCandleIngestionRunnerStatusUseCaseMock.execute,
    ).toHaveBeenCalled();
    expect(result).toEqual({
      queuedJobs: 3,
      runningJobs: 1,
      maxConcurrentJobs: 1,
      maxConcurrentSymbols: 6,
      maxApiConcurrency: 8,
      apiInFlight: 2,
    });
  });

  it('startInPlayRun delegates and returns run envelope', async () => {
    const { controller, mocks } = makeController({
      startInPlayRunUseCaseMock: {
        execute: jest.fn().mockResolvedValue({
          runId: 'inplay-1',
          status: 'pending',
        }),
      },
    });

    const result = await controller.startInPlayRun({
      interval: '15m',
      startDate: '2026-02-01T00:00:00.000Z',
      endDate: '2026-02-28T23:59:59.999Z',
    });

    expect(mocks.startInPlayRunUseCaseMock.execute).toHaveBeenCalled();
    expect(result).toEqual({
      runId: 'inplay-1',
      status: 'pending',
    });
  });

  it('listInPlayRanges returns ranges for existing run', async () => {
    const { controller, mocks } = makeController({
      listInPlayRangesUseCaseMock: {
        execute: jest.fn().mockResolvedValue({
          runId: 'inplay-1',
          items: [
            {
              id: 'range-1',
              symbol: 'BTCUSDT',
              interval: '15m',
              startTime: '1760000000000',
              endTime: '1760003600000',
            },
          ],
        }),
      },
    });

    const result = await controller.listInPlayRanges('inplay-1', {
      symbol: 'BTCUSDT',
    });
    expect(mocks.listInPlayRangesUseCaseMock.execute).toHaveBeenCalledWith(
      'inplay-1',
      { symbol: 'BTCUSDT' },
    );
    expect(result).toHaveProperty('items.0.symbol', 'BTCUSDT');
  });

  it('generateInPlayEntryWindows returns generated windows', async () => {
    const { controller, mocks } = makeController({
      generateInPlayEntryWindowsUseCaseMock: {
        execute: jest.fn().mockResolvedValue({
          runId: 'inplay-1',
          generatedCount: 1,
          items: [
            {
              id: 'ew-1',
              runId: 'inplay-1',
              rangeId: 'r-1',
              symbol: 'BTCUSDT',
              interval: '15m',
              zoneId: 'z-1',
              zoneDirection: 'bullish',
              zoneLowerBound: '100',
              zoneUpperBound: '101',
              zoneStartTime: '1760000000000',
              mitigatedCandleOpenTime: '1760000900000',
              mitigatedCandleCloseTime: '1760001799999',
              outsideCandleCloseTime: '1760002699999',
              fromTime: '1760000000000',
              toTime: '1760002699999',
              description: 'window',
              createdAt: new Date('2026-03-04T00:00:00.000Z'),
            },
          ],
        }),
      },
    });

    const result = await controller.generateInPlayEntryWindows('inplay-1', {
      symbol: 'BTCUSDT',
    });
    expect(
      mocks.generateInPlayEntryWindowsUseCaseMock.execute,
    ).toHaveBeenCalledWith('inplay-1', { symbol: 'BTCUSDT' });
    expect(result).toHaveProperty('generatedCount', 1);
  });

  it('listInPlayEntryWindows returns windows for existing run', async () => {
    const { controller, mocks } = makeController({
      listInPlayEntryWindowsUseCaseMock: {
        execute: jest.fn().mockResolvedValue({
          runId: 'inplay-1',
          items: [
            {
              id: 'ew-1',
              runId: 'inplay-1',
              rangeId: 'r-1',
              symbol: 'BTCUSDT',
              interval: '15m',
              zoneId: 'z-1',
              zoneDirection: 'bullish',
              zoneLowerBound: '100',
              zoneUpperBound: '101',
              zoneStartTime: '1760000000000',
              mitigatedCandleOpenTime: '1760000900000',
              mitigatedCandleCloseTime: '1760001799999',
              outsideCandleCloseTime: '1760002699999',
              fromTime: '1760000000000',
              toTime: '1760002699999',
              description: 'window',
              createdAt: new Date('2026-03-04T00:00:00.000Z'),
            },
          ],
        }),
      },
    });

    const result = await controller.listInPlayEntryWindows('inplay-1', {
      symbol: 'BTCUSDT',
    });
    expect(mocks.listInPlayEntryWindowsUseCaseMock.execute).toHaveBeenCalledWith(
      'inplay-1',
      { symbol: 'BTCUSDT' },
    );
    expect(result).toHaveProperty('items.0.id', 'ew-1');
  });

  it('runInPlayBacktest returns lightweight summary', async () => {
    const { controller, mocks } = makeController({
      runInPlayBacktestUseCaseMock: {
        execute: jest.fn().mockResolvedValue({
          runId: 'inplay-1',
          status: 'completed',
          symbolsProcessed: 1,
          windows: 5,
          mergedWindows: 3,
          processedCandles: 1234,
          generatedSignals: 42,
          totalTrades: 7,
          winningTrades: 4,
          losingTrades: 3,
          winRate: 57.14,
          totalPnL: '123.45',
          perSymbol: [],
        }),
      },
    });

    const result = await controller.runInPlayBacktest('inplay-1', {
      symbol: 'BTCUSDT',
    });

    expect(mocks.runInPlayBacktestUseCaseMock.execute).toHaveBeenCalledWith(
      'inplay-1',
      { symbol: 'BTCUSDT' },
    );
    expect(result).toHaveProperty('status', 'completed');
    expect(result).toHaveProperty('processedCandles', 1234);
  });

  it('runInPlayBacktest throws NotFoundException when run missing', async () => {
    const { controller } = makeController({
      runInPlayBacktestUseCaseMock: {
        execute: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      controller.runInPlayBacktest('missing-run', { symbol: 'BTCUSDT' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('listCandleIngestionJobs delegates and returns paged jobs', async () => {
    const { controller, mocks } = makeController({
      listCandleIngestionJobsUseCaseMock: {
        execute: jest.fn().mockResolvedValue({
          items: [
            {
              id: 'ing-1',
              mode: 'incremental',
              status: 'running',
              errorMessage: null,
              interval: '4h',
              backfillCandles: 1000,
              symbolsTotal: 500,
              symbolsCompleted: 120,
              symbolsFailed: 1,
              symbolsSkipped: 10,
              configHash: 'hash1',
              freshnessTargetMs: null,
              cancelRequestedAt: null,
              startedAt: new Date('2026-03-03T00:00:00.000Z'),
              completedAt: null,
              createdAt: new Date('2026-03-03T00:00:00.000Z'),
              updatedAt: new Date('2026-03-03T00:10:00.000Z'),
            },
          ],
          page: 1,
          limit: 20,
          total: 1,
        }),
      },
    });

    const query = { status: 'running' as const, page: 1, limit: 20 };
    const result = await controller.listCandleIngestionJobs(query);

    expect(mocks.listCandleIngestionJobsUseCaseMock.execute).toHaveBeenCalledWith(
      query,
    );
    expect(result.total).toBe(1);
    expect(result.items[0]).toHaveProperty('id', 'ing-1');
  });

  it('getCandleIngestionJobStatus returns job when found', async () => {
    const { controller, mocks } = makeController({
      getCandleIngestionJobStatusUseCaseMock: {
        execute: jest.fn().mockResolvedValue({
          id: 'ing-1',
          mode: 'incremental',
          status: 'running',
          errorMessage: null,
          interval: '4h',
          backfillCandles: 1000,
          symbolsTotal: 500,
          symbolsCompleted: 100,
          symbolsFailed: 0,
          symbolsSkipped: 0,
          configHash: 'hash1',
          freshnessTargetMs: null,
          startedAt: new Date('2026-03-01T00:00:00.000Z'),
          completedAt: null,
          createdAt: new Date('2026-03-01T00:00:00.000Z'),
          updatedAt: new Date('2026-03-01T00:10:00.000Z'),
        }),
      },
    });

    const result = await controller.getCandleIngestionJobStatus('ing-1');
    expect(mocks.getCandleIngestionJobStatusUseCaseMock.execute).toHaveBeenCalledWith(
      'ing-1',
    );
    expect(result).toHaveProperty('id', 'ing-1');
    expect(result).toHaveProperty('status', 'running');
  });

  it('getCandleIngestionJobStatus throws NotFoundException when missing', async () => {
    const { controller } = makeController({
      getCandleIngestionJobStatusUseCaseMock: {
        execute: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      controller.getCandleIngestionJobStatus('missing-ing-job'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getCandleIngestionJobDetails returns details when found', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(
      new Date('2026-03-03T00:10:00.000Z').getTime(),
    );
    const { controller, mocks } = makeController({
      getCandleIngestionJobDetailsUseCaseMock: {
        execute: jest.fn().mockResolvedValue({
          job: {
            id: 'ing-1',
            mode: 'incremental',
            status: 'running',
            errorMessage: null,
            interval: '4h',
            backfillCandles: 1000,
            symbolsTotal: 500,
            symbolsCompleted: 120,
            symbolsFailed: 2,
            symbolsSkipped: 10,
            configHash: 'hash1',
            freshnessTargetMs: null,
            cancelRequestedAt: null,
            createdAt: new Date('2026-03-03T00:00:00.000Z'),
            updatedAt: new Date('2026-03-03T00:10:00.000Z'),
            startedAt: new Date('2026-03-03T00:00:00.000Z'),
            completedAt: null,
          },
          symbolRunStats: {
            total: 132,
            pending: 0,
            running: 1,
            completed: 120,
            failed: 2,
            skipped: 9,
          },
        }),
      },
    });

    const result = await controller.getCandleIngestionJobDetails('ing-1');
    expect(
      mocks.getCandleIngestionJobDetailsUseCaseMock.execute,
    ).toHaveBeenCalledWith('ing-1');
    expect(result).toHaveProperty('job.id', 'ing-1');
    expect(result).toHaveProperty('symbolRunStats.total', 132);
    expect(result).toHaveProperty('progressPercent', 99.24);
    expect(result.eta).toBeInstanceOf(Date);
    nowSpy.mockRestore();
  });

  it('getCandleIngestionJobDetails throws NotFoundException when missing', async () => {
    const { controller } = makeController({
      getCandleIngestionJobDetailsUseCaseMock: {
        execute: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      controller.getCandleIngestionJobDetails('missing-ing-job'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getCandleIngestionJobSymbolRuns returns runs when found', async () => {
    const { controller, mocks } = makeController({
      getCandleIngestionJobSymbolRunsUseCaseMock: {
        execute: jest.fn().mockResolvedValue([
          {
            id: 'run-1',
            jobId: 'ing-1',
            symbol: 'BTCUSDT',
            interval: '4h',
            status: 'completed',
            errorMessage: null,
            fromOpenTime: '1760000000000',
            toOpenTime: '1761000000000',
            lastSyncedOpenTime: '1761000000000',
            processedCandles: 100,
            insertedCandles: 95,
            updatedCandles: 5,
            retries: 0,
            startedAt: new Date('2026-03-01T00:00:00.000Z'),
            completedAt: new Date('2026-03-01T00:01:00.000Z'),
            createdAt: new Date('2026-03-01T00:00:00.000Z'),
            updatedAt: new Date('2026-03-01T00:01:00.000Z'),
          },
        ]),
      },
    });

    const result = await controller.getCandleIngestionJobSymbolRuns('ing-1');
    expect(
      mocks.getCandleIngestionJobSymbolRunsUseCaseMock.execute,
    ).toHaveBeenCalledWith('ing-1');
    expect(result).toEqual({
      jobId: 'ing-1',
      runs: expect.any(Array),
    });
  });

  it('getCandleIngestionJobSymbolRuns throws NotFoundException when job missing', async () => {
    const { controller } = makeController({
      getCandleIngestionJobSymbolRunsUseCaseMock: {
        execute: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      controller.getCandleIngestionJobSymbolRuns('missing-ing-job'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('cancelCandleIngestionJob delegates to use-case and returns status', async () => {
    const { controller, mocks } = makeController({
      cancelCandleIngestionJobUseCaseMock: {
        execute: jest.fn().mockResolvedValue({
          jobId: 'ing-1',
          status: 'running',
        }),
      },
    });

    const result = await controller.cancelCandleIngestionJob('ing-1');
    expect(
      mocks.cancelCandleIngestionJobUseCaseMock.execute,
    ).toHaveBeenCalledWith('ing-1');
    expect(result).toEqual({
      jobId: 'ing-1',
      status: 'running',
    });
  });

  it('cancelCandleIngestionJob throws NotFoundException when job missing', async () => {
    const { controller } = makeController({
      cancelCandleIngestionJobUseCaseMock: {
        execute: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      controller.cancelCandleIngestionJob('missing-ing-job'),
    ).rejects.toBeInstanceOf(NotFoundException);
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

  it('listCandleIngestionJobs maps semantic validation errors to BadRequestException', async () => {
    const { controller } = makeController({
      listCandleIngestionJobsUseCaseMock: {
        execute: jest
          .fn()
          .mockRejectedValue(
            new Error('fromDate must be before or equal to toDate'),
          ),
      },
    });

    await expect(
      controller.listCandleIngestionJobs({
        fromDate: '2026-03-03T00:00:00.000Z',
        toDate: '2026-03-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
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
