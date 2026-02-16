import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { GetImportJobStatusUseCase } from '../src/backtesting/application/use-cases/get-import-job-status.use-case';
import { GetImportQueueOverviewUseCase } from '../src/backtesting/application/use-cases/get-import-queue-overview.use-case';
import { ImportBinanceDataUseCase } from '../src/backtesting/application/use-cases/import-binance-data.use-case';
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

  it('POST /backtesting/run returns backtest summary', async () => {
    runBacktestUseCaseMock.execute.mockResolvedValue({
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
    expect(res.body).toHaveProperty('symbol', 'BTCUSDT');
    expect(res.body).toHaveProperty('metrics.totalTrades', 2);
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
