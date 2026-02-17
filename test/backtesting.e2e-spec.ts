import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { GetImportJobStatusUseCase } from '../src/backtesting/application/use-cases/get-import-job-status.use-case';
import { GetImportQueueOverviewUseCase } from '../src/backtesting/application/use-cases/get-import-queue-overview.use-case';
import { ImportBinanceDataUseCase } from '../src/backtesting/application/use-cases/import-binance-data.use-case';
import { GetBacktestRunUseCase } from '../src/backtesting/application/use-cases/get-backtest-run.use-case';
import { CancelBacktestRunUseCase } from '../src/backtesting/application/use-cases/cancel-backtest-run.use-case';
import { GetBacktestRunSummaryUseCase } from '../src/backtesting/application/use-cases/get-backtest-run-summary.use-case';
import { GetBacktestRunSignalsUseCase } from '../src/backtesting/application/use-cases/get-backtest-run-signals.use-case';
import { GetBacktestRunEquityUseCase } from '../src/backtesting/application/use-cases/get-backtest-run-equity.use-case';
import { ListBacktestRunsUseCase } from '../src/backtesting/application/use-cases/list-backtest-runs.use-case';
import { ListActiveBacktestRunsUseCase } from '../src/backtesting/application/use-cases/list-active-backtest-runs.use-case';
import { RunBacktestUseCase } from '../src/backtesting/application/use-cases/run-backtest.use-case';
import { BacktestingController } from '../src/backtesting/interfaces/http/backtesting.controller';

describe('Backtesting (e2e)', () => {
  let app: INestApplication;

  const importUseCaseMock = {
    execute: jest.fn(),
  };

  const getStatusUseCaseMock = {
    execute: jest.fn(),
  };

  const getQueueOverviewUseCaseMock = {
    execute: jest.fn(),
  };

  const runBacktestUseCaseMock = {
    execute: jest.fn(),
  };

  const cancelBacktestRunUseCaseMock = {
    execute: jest.fn(),
  };

  const getBacktestRunUseCaseMock = {
    execute: jest.fn(),
  };

  const getBacktestRunSummaryUseCaseMock = {
    execute: jest.fn(),
  };

  const getBacktestRunSignalsUseCaseMock = {
    execute: jest.fn(),
  };

  const getBacktestRunEquityUseCaseMock = {
    execute: jest.fn(),
  };

  const listBacktestRunsUseCaseMock = {
    execute: jest.fn(),
  };

  const listActiveBacktestRunsUseCaseMock = {
    execute: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [BacktestingController],
      providers: [
        {
          provide: ImportBinanceDataUseCase,
          useValue: importUseCaseMock,
        },
        {
          provide: GetImportJobStatusUseCase,
          useValue: getStatusUseCaseMock,
        },
        {
          provide: GetImportQueueOverviewUseCase,
          useValue: getQueueOverviewUseCaseMock,
        },
        {
          provide: RunBacktestUseCase,
          useValue: runBacktestUseCaseMock,
        },
        {
          provide: CancelBacktestRunUseCase,
          useValue: cancelBacktestRunUseCaseMock,
        },
        {
          provide: GetBacktestRunUseCase,
          useValue: getBacktestRunUseCaseMock,
        },
        {
          provide: GetBacktestRunSummaryUseCase,
          useValue: getBacktestRunSummaryUseCaseMock,
        },
        {
          provide: GetBacktestRunSignalsUseCase,
          useValue: getBacktestRunSignalsUseCaseMock,
        },
        {
          provide: GetBacktestRunEquityUseCase,
          useValue: getBacktestRunEquityUseCaseMock,
        },
        {
          provide: ListBacktestRunsUseCase,
          useValue: listBacktestRunsUseCaseMock,
        },
        {
          provide: ListActiveBacktestRunsUseCase,
          useValue: listActiveBacktestRunsUseCaseMock,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: false,
      }),
    );
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /backtesting/import returns queued job payload', async () => {
    importUseCaseMock.execute.mockResolvedValue({
      jobId: 'job-e2e-1',
      status: 'pending',
      filesQueued: 3,
      downloadedCount: 0,
      queuedPosition: 1,
    });

    const payload = {
      symbol: 'BTCUSDT',
      interval: '1m',
      startDate: '2024-01-01T00:00:00.000Z',
      endDate: '2024-03-31T23:59:59.999Z',
      overwrite: false,
    };

    const res = await request(app.getHttpServer())
      .post('/backtesting/import')
      .send(payload)
      .expect(201);

    expect(importUseCaseMock.execute).toHaveBeenCalledWith(
      expect.objectContaining(payload),
    );
    expect(res.body).toEqual({
      jobId: 'job-e2e-1',
      status: 'pending',
      filesQueued: 3,
      downloadedCount: 0,
      queuedPosition: 1,
    });
  });

  it('GET /backtesting/health returns health payload', async () => {
    const res = await request(app.getHttpServer())
      .get('/backtesting/health')
      .expect(200);

    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('service', 'backtesting');
    expect(new Date(res.body.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('POST /backtesting/import rejects invalid payload', async () => {
    const badPayload = {
      symbol: 'btc-usdt',
      interval: '1m',
      startDate: 'not-a-date',
      endDate: 'still-not-a-date',
    };

    await request(app.getHttpServer())
      .post('/backtesting/import')
      .send(badPayload)
      .expect(400);

    expect(importUseCaseMock.execute).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: 'startDate after endDate',
      errorMessage: 'startDate must be before or equal to endDate',
    },
    {
      name: 'future date range',
      errorMessage: 'Date range cannot be in the future',
    },
  ])('POST /backtesting/import returns 400 for $name', async ({ errorMessage }) => {
    importUseCaseMock.execute.mockRejectedValueOnce(new Error(errorMessage));

    const payload = {
      symbol: 'BTCUSDT',
      interval: '1m',
      startDate: '2024-01-01T00:00:00.000Z',
      endDate: '2024-01-31T23:59:59.999Z',
      overwrite: false,
    };

    const res = await request(app.getHttpServer())
      .post('/backtesting/import')
      .send(payload)
      .expect(400);

    expect(res.body).toHaveProperty('message', errorMessage);
  });

  it.each([
    {
      name: 'invalid symbol format',
      payload: {
        symbol: 'BTC-USDT',
        interval: '1m',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-31T23:59:59.999Z',
      },
    },
    {
      name: 'missing symbol',
      payload: {
        interval: '1m',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-31T23:59:59.999Z',
      },
    },
    {
      name: 'missing interval',
      payload: {
        symbol: 'BTCUSDT',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-31T23:59:59.999Z',
      },
    },
    {
      name: 'missing startDate',
      payload: {
        symbol: 'BTCUSDT',
        interval: '1m',
        endDate: '2024-01-31T23:59:59.999Z',
      },
    },
    {
      name: 'missing endDate',
      payload: {
        symbol: 'BTCUSDT',
        interval: '1m',
        startDate: '2024-01-01T00:00:00.000Z',
      },
    },
  ])('POST /backtesting/import rejects $name', async ({ payload }) => {
    await request(app.getHttpServer())
      .post('/backtesting/import')
      .send(payload)
      .expect(400);

    expect(importUseCaseMock.execute).not.toHaveBeenCalled();
  });

  it('GET /backtesting/import/:jobId returns job status', async () => {
    getStatusUseCaseMock.execute.mockResolvedValue({
      jobId: 'job-e2e-2',
      status: 'downloading',
      queuedPosition: null,
      queueSize: 0,
      isQueued: false,
      activeImports: 1,
      maxConcurrentImports: 2,
      symbol: 'BTCUSDT',
      interval: '1m',
      totalFiles: 3,
      downloadedFiles: 1,
      failedFiles: 0,
      checksumValid: true,
      errorMessage: null,
      lastSuccessfulTime: '1704067319999',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:10:00.000Z',
    });

    const res = await request(app.getHttpServer())
      .get('/backtesting/import/job-e2e-2')
      .expect(200);

    expect(getStatusUseCaseMock.execute).toHaveBeenCalledWith('job-e2e-2');
    expect(res.body).toHaveProperty('jobId', 'job-e2e-2');
    expect(res.body).toHaveProperty('status', 'downloading');
  });

  it('GET /backtesting/import/:jobId returns 404 when job not found', async () => {
    getStatusUseCaseMock.execute.mockResolvedValueOnce(null);

    await request(app.getHttpServer())
      .get('/backtesting/import/missing-job')
      .expect(404);
  });

  it('GET /backtesting/import/queue returns queue overview', async () => {
    getQueueOverviewUseCaseMock.execute.mockReturnValue({
      queueSize: 2,
      activeImports: 1,
      maxConcurrentImports: 2,
      queuedJobs: [
        {
          jobId: 'job-e2e-q-1',
          symbol: 'ETHUSDT',
          interval: '1m',
          queuedPosition: 1,
        },
      ],
    });

    const res = await request(app.getHttpServer())
      .get('/backtesting/import/queue')
      .expect(200);

    expect(getQueueOverviewUseCaseMock.execute).toHaveBeenCalled();
    expect(res.body).toEqual({
      queueSize: 2,
      activeImports: 1,
      maxConcurrentImports: 2,
      queuedJobs: [
        {
          jobId: 'job-e2e-q-1',
          symbol: 'ETHUSDT',
          interval: '1m',
          queuedPosition: 1,
        },
      ],
    });
  });

  it('GET /backtesting/runs/active returns active run list', async () => {
    listActiveBacktestRunsUseCaseMock.execute.mockResolvedValue({
      items: [
        {
          id: 'run-active-1',
          symbol: 'BTCUSDT',
          interval: '15m',
          strategyVersion: 'fvg-bos-v1',
          status: 'running',
          processedCandles: 5000,
          generatedSignals: 150,
          startTime: '1704067200000',
          endTime: '1706745599000',
          createdAt: '2024-02-01T00:00:00.000Z',
          updatedAt: '2024-02-01T00:10:00.000Z',
          cancelRequestedAt: null,
        },
      ],
    });

    const res = await request(app.getHttpServer())
      .get('/backtesting/runs/active')
      .expect(200);

    expect(listActiveBacktestRunsUseCaseMock.execute).toHaveBeenCalled();
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toHaveProperty('status', 'running');
  });

  it('POST /backtesting/run returns backtest summary', async () => {
    runBacktestUseCaseMock.execute.mockResolvedValue({
      runId: 'run-e2e-1',
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
    });

    const payload = {
      symbol: 'BTCUSDT',
      startDate: '2024-01-01T00:00:00.000Z',
      endDate: '2024-01-31T23:59:59.999Z',
      fromInterval: '1m',
      toInterval: '15m',
      initialBalance: 10000,
      riskPercent: 2,
      rewardRatio: 2,
    };

    const res = await request(app.getHttpServer())
      .post('/backtesting/run')
      .send(payload)
      .expect(201);

    expect(runBacktestUseCaseMock.execute).toHaveBeenCalledWith(
      expect.objectContaining(payload),
    );
    expect(res.body).toHaveProperty('runId', 'run-e2e-1');
    expect(res.body).toHaveProperty('status', 'completed');
    expect(res.body).toHaveProperty('symbol', 'BTCUSDT');
    expect(res.body).toHaveProperty('metrics.totalTrades', 2);
  });

  it('POST /backtesting/run/:runId/cancel requests cancellation', async () => {
    cancelBacktestRunUseCaseMock.execute.mockResolvedValue({
      runId: 'run-e2e-1',
      status: 'cancelled',
    });

    const res = await request(app.getHttpServer())
      .post('/backtesting/run/run-e2e-1/cancel')
      .expect(201);

    expect(cancelBacktestRunUseCaseMock.execute).toHaveBeenCalledWith('run-e2e-1');
    expect(res.body).toEqual({
      runId: 'run-e2e-1',
      status: 'cancelled',
    });
  });

  it('POST /backtesting/run/:runId/cancel returns 404 when run not found', async () => {
    cancelBacktestRunUseCaseMock.execute.mockResolvedValueOnce(null);

    await request(app.getHttpServer())
      .post('/backtesting/run/missing-run/cancel')
      .expect(404);
  });

  it('GET /backtesting/run/:runId returns persisted run details', async () => {
    getBacktestRunUseCaseMock.execute.mockResolvedValue({
      id: 'run-e2e-1',
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
      createdAt: '2024-02-01T00:00:00.000Z',
      trades: [],
    });

    const res = await request(app.getHttpServer())
      .get('/backtesting/run/run-e2e-1')
      .expect(200);

    expect(getBacktestRunUseCaseMock.execute).toHaveBeenCalledWith('run-e2e-1');
    expect(res.body).toHaveProperty('id', 'run-e2e-1');
    expect(res.body).toHaveProperty('symbol', 'BTCUSDT');
    expect(res.body).toHaveProperty('status', 'completed');
    expect(res.body).toHaveProperty('signalsCount', 4);
    expect(res.body).toHaveProperty('equityPointsCount', 3);
  });

  it('GET /backtesting/run/:runId returns 404 when run not found', async () => {
    getBacktestRunUseCaseMock.execute.mockResolvedValueOnce(null);

    await request(app.getHttpServer())
      .get('/backtesting/run/missing-run')
      .expect(404);
  });

  it('GET /backtesting/run/:runId/summary returns compact run summary', async () => {
    getBacktestRunSummaryUseCaseMock.execute.mockResolvedValue({
      id: 'run-e2e-1',
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
      createdAt: '2024-02-01T00:00:00.000Z',
    });

    const res = await request(app.getHttpServer())
      .get('/backtesting/run/run-e2e-1/summary')
      .expect(200);

    expect(getBacktestRunSummaryUseCaseMock.execute).toHaveBeenCalledWith(
      'run-e2e-1',
    );
    expect(res.body).toHaveProperty('id', 'run-e2e-1');
    expect(res.body).toHaveProperty('status', 'completed');
    expect(res.body).toHaveProperty('lastEquity', '10012.30');
  });

  it('GET /backtesting/run/:runId/summary returns 404 when run not found', async () => {
    getBacktestRunSummaryUseCaseMock.execute.mockResolvedValueOnce(null);

    await request(app.getHttpServer())
      .get('/backtesting/run/missing-run/summary')
      .expect(404);
  });

  it('GET /backtesting/run/:runId/signals returns persisted signal events', async () => {
    getBacktestRunSignalsUseCaseMock.execute.mockResolvedValue({
      items: [
        {
          id: 'sig-e2e-1',
          timestamp: '1704067200000',
          signalType: 'BUY',
          reason: 'fvg_bos_confluence',
          price: '42250.10',
          metadata: { source: 'e2e' },
          createdAt: '2024-02-01T00:00:00.000Z',
        },
      ],
      limit: 1,
      total: 3,
      nextCursor: '1704067200000:5d951645-7b12-4af4-8f5d-0f7d2782d8ba',
    });

    const res = await request(app.getHttpServer())
      .get('/backtesting/run/run-e2e-1/signals?limit=1')
      .expect(200);

    expect(getBacktestRunSignalsUseCaseMock.execute).toHaveBeenCalledWith(
      'run-e2e-1',
      { limit: 1 },
    );
    expect(res.body.items[0]).toHaveProperty('id', 'sig-e2e-1');
    expect(res.body).toHaveProperty('total', 3);
    expect(res.body).toHaveProperty(
      'nextCursor',
      '1704067200000:5d951645-7b12-4af4-8f5d-0f7d2782d8ba',
    );
  });

  it('GET /backtesting/run/:runId/signals forwards cursor query', async () => {
    getBacktestRunSignalsUseCaseMock.execute.mockResolvedValue({
      items: [],
      limit: 2,
      total: 3,
      nextCursor: null,
    });

    await request(app.getHttpServer())
      .get(
        '/backtesting/run/run-e2e-1/signals?limit=2&cursor=1704067200000:5d951645-7b12-4af4-8f5d-0f7d2782d8ba',
      )
      .expect(200);

    expect(getBacktestRunSignalsUseCaseMock.execute).toHaveBeenCalledWith(
      'run-e2e-1',
      {
        limit: 2,
        cursor: '1704067200000:5d951645-7b12-4af4-8f5d-0f7d2782d8ba',
      },
    );
  });

  it('GET /backtesting/run/:runId/signals returns 404 when run not found', async () => {
    getBacktestRunSignalsUseCaseMock.execute.mockResolvedValueOnce(null);

    await request(app.getHttpServer())
      .get('/backtesting/run/missing-run/signals')
      .expect(404);
  });

  it('GET /backtesting/run/:runId/equity returns persisted equity points', async () => {
    getBacktestRunEquityUseCaseMock.execute.mockResolvedValue({
      items: [
        {
          id: 'eq-e2e-1',
          timestamp: '1704067200000',
          equity: '10000',
          drawdown: '0',
          createdAt: '2024-02-01T00:00:00.000Z',
        },
      ],
      limit: 100,
      total: 1,
      nextCursor: null,
    });

    const res = await request(app.getHttpServer())
      .get('/backtesting/run/run-e2e-1/equity?fromTs=1704067200000&toTs=1704067319999')
      .expect(200);

    expect(getBacktestRunEquityUseCaseMock.execute).toHaveBeenCalledWith(
      'run-e2e-1',
      { fromTs: '1704067200000', toTs: '1704067319999' },
    );
    expect(res.body.items[0]).toHaveProperty('id', 'eq-e2e-1');
    expect(res.body).toHaveProperty('total', 1);
    expect(res.body).toHaveProperty('nextCursor', null);
  });

  it('GET /backtesting/run/:runId/equity returns 404 when run not found', async () => {
    getBacktestRunEquityUseCaseMock.execute.mockResolvedValueOnce(null);

    await request(app.getHttpServer())
      .get('/backtesting/run/missing-run/equity')
      .expect(404);
  });

  it('GET /backtesting/run/:runId/signals returns 400 for invalid cursor format', async () => {
    await request(app.getHttpServer())
      .get('/backtesting/run/run-e2e-1/signals?cursor=bad-cursor')
      .expect(400);

    expect(getBacktestRunSignalsUseCaseMock.execute).not.toHaveBeenCalled();
  });

  it('GET /backtesting/run/:runId/signals returns 400 when limit exceeds maximum', async () => {
    await request(app.getHttpServer())
      .get('/backtesting/run/run-e2e-1/signals?limit=1001')
      .expect(400);

    expect(getBacktestRunSignalsUseCaseMock.execute).not.toHaveBeenCalled();
  });

  it('GET /backtesting/run/:runId/equity returns 400 when fromTs > toTs', async () => {
    getBacktestRunEquityUseCaseMock.execute.mockRejectedValueOnce(
      new Error('fromTs must be before or equal to toTs'),
    );

    await request(app.getHttpServer())
      .get('/backtesting/run/run-e2e-1/equity?fromTs=200&toTs=100')
      .expect(400);
  });

  it('GET /backtesting/run/:runId/equity returns 400 when limit exceeds maximum', async () => {
    await request(app.getHttpServer())
      .get('/backtesting/run/run-e2e-1/equity?limit=5000')
      .expect(400);

    expect(getBacktestRunEquityUseCaseMock.execute).not.toHaveBeenCalled();
  });

  it('GET /backtesting/runs returns paginated run list', async () => {
    listBacktestRunsUseCaseMock.execute.mockResolvedValue({
      items: [
        {
          id: 'run-e2e-2',
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
          createdAt: '2024-02-01T00:00:00.000Z',
        },
      ],
      page: 2,
      limit: 10,
      total: 25,
    });

    const res = await request(app.getHttpServer())
      .get(
        '/backtesting/runs?symbol=ETHUSDT&interval=15m&sortBy=winRate&sortOrder=asc&page=2&limit=10',
      )
      .expect(200);

    expect(listBacktestRunsUseCaseMock.execute).toHaveBeenCalledWith({
      symbol: 'ETHUSDT',
      interval: '15m',
      sortBy: 'winRate',
      sortOrder: 'asc',
      page: 2,
      limit: 10,
    });
    expect(res.body).toHaveProperty('total', 25);
    expect(res.body.items[0]).toHaveProperty('id', 'run-e2e-2');
  });

  it('GET /backtesting/runs returns 400 when query is invalid', async () => {
    await request(app.getHttpServer())
      .get('/backtesting/runs?page=0&limit=-1')
      .expect(400);

    expect(listBacktestRunsUseCaseMock.execute).not.toHaveBeenCalled();
  });

  it('GET /backtesting/runs returns 400 for invalid sortBy', async () => {
    await request(app.getHttpServer())
      .get('/backtesting/runs?sortBy=pnl&sortOrder=asc')
      .expect(400);

    expect(listBacktestRunsUseCaseMock.execute).not.toHaveBeenCalled();
  });

  it('POST /backtesting/run rejects invalid payload', async () => {
    const badPayload = {
      symbol: 'BTC-USDT',
      startDate: 'not-a-date',
      endDate: 'still-not-a-date',
    };

    await request(app.getHttpServer())
      .post('/backtesting/run')
      .send(badPayload)
      .expect(400);

    expect(runBacktestUseCaseMock.execute).not.toHaveBeenCalled();
  });
});
