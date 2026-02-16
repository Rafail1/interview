import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { BacktestingModule } from '../src/backtesting/backtesting.module';
import { PrismaService } from '../src/core/infrastructure/prisma.service';

const maybeDescribe = process.env.DATABASE_URL ? describe : describe.skip;

maybeDescribe('Backtesting (db e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const createdRunIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), BacktestingModule],
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

    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    if (createdRunIds.length === 0) {
      return;
    }
    await prisma.backtestRun.deleteMany({
      where: {
        id: {
          in: createdRunIds.splice(0, createdRunIds.length),
        },
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  async function seedRun(): Promise<string> {
    const run = await prisma.backtestRun.create({
      data: {
        symbol: 'BTCUSDT',
        interval: '15m',
        strategyVersion: 'fvg-bos-v1',
        config: {
          fromInterval: '1m',
          toInterval: '15m',
          initialBalance: 10000,
        },
        startTime: 1704067200000n,
        endTime: 1706745599000n,
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
        trades: {
          create: [
            {
              entryTime: 1704067200000n,
              exitTime: 1704067319999n,
              entryPrice: '42250.10',
              exitPrice: '42290.10',
              quantity: '0.01',
              side: 'BUY',
              pnl: '0.4',
              pnlPercent: 0.09,
              status: 'closed',
            },
          ],
        },
        signals: {
          create: [
            {
              timestamp: 1704067200000n,
              signalType: 'BUY',
              reason: 'test_signal_a',
              price: '42250.10',
              metadata: { rank: 1 },
            },
            {
              timestamp: 1704067260000n,
              signalType: 'SELL',
              reason: 'test_signal_b',
              price: '42280.50',
              metadata: { rank: 2 },
            },
          ],
        },
        equityPoints: {
          create: [
            {
              timestamp: 1704067200000n,
              equity: '10000',
              drawdown: '0',
            },
            {
              timestamp: 1704067319999n,
              equity: '10012.30',
              drawdown: '2.50',
            },
          ],
        },
      },
      select: { id: true },
    });

    createdRunIds.push(run.id);
    return run.id;
  }

  it('GET /backtesting/run/:runId returns persisted run details from DB', async () => {
    const runId = await seedRun();

    const res = await request(app.getHttpServer())
      .get(`/backtesting/run/${runId}`)
      .expect(200);

    expect(res.body).toHaveProperty('id', runId);
    expect(res.body).toHaveProperty('signalsCount', 2);
    expect(res.body).toHaveProperty('equityPointsCount', 2);
  });

  it('GET /backtesting/run/:runId/summary returns compact summary from DB', async () => {
    const runId = await seedRun();

    const res = await request(app.getHttpServer())
      .get(`/backtesting/run/${runId}/summary`)
      .expect(200);

    expect(res.body).toHaveProperty('id', runId);
    expect(res.body).toHaveProperty('signalsCount', 2);
    expect(res.body).toHaveProperty('lastEquity', '10012.30');
    expect(res.body).toHaveProperty('lastDrawdown', '2.50');
  });

  it('GET /backtesting/run/:runId/signals returns paginated and filtered series from DB', async () => {
    const runId = await seedRun();

    const res = await request(app.getHttpServer())
      .get(
        `/backtesting/run/${runId}/signals?fromTs=1704067200000&toTs=1704067260000&page=2&limit=1`,
      )
      .expect(200);

    expect(res.body).toHaveProperty('total', 2);
    expect(res.body).toHaveProperty('page', 2);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toHaveProperty('reason', 'test_signal_b');
  });

  it('GET /backtesting/run/:runId/equity returns paginated and filtered series from DB', async () => {
    const runId = await seedRun();

    const res = await request(app.getHttpServer())
      .get(`/backtesting/run/${runId}/equity?fromTs=1704067200000&limit=1`)
      .expect(200);

    expect(res.body).toHaveProperty('total', 2);
    expect(res.body).toHaveProperty('limit', 1);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toHaveProperty('equity', '10000');
  });

  it('GET /backtesting/runs lists seeded runs from DB', async () => {
    await seedRun();

    const res = await request(app.getHttpServer())
      .get('/backtesting/runs?symbol=BTCUSDT&limit=10')
      .expect(200);

    expect(res.body).toHaveProperty('total', 1);
    expect(res.body.items[0]).toHaveProperty('symbol', 'BTCUSDT');
  });
});
