import { randomUUID } from 'crypto';
import { Price } from 'src/backtesting/domain/value-objects/price.value-object';
import { Timestamp } from 'src/backtesting/domain/value-objects/timestamp.value-object';
import { Trade } from 'src/backtesting/domain/entities/trade.entity';
import { PrismaService } from 'src/core/infrastructure/prisma.service';
import { BacktestRunMapper } from '../mappers/backtest-run.mapper';
import { BacktestRunRepository } from './backtest-run.repository';

const maybeDescribe = process.env.DATABASE_URL ? describe : describe.skip;

maybeDescribe('BacktestRunRepository integration', () => {
  let prisma: PrismaService;
  let repository: BacktestRunRepository;
  const createdRunIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    repository = new BacktestRunRepository(prisma, new BacktestRunMapper());
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
    await prisma.$disconnect();
  });

  it('saves run with trades and reads it back via findById', async () => {
    const tradeA = Trade.create(
      randomUUID(),
      Timestamp.fromMs(1704067260000),
      Price.from('42260.20'),
      '0.01',
      'BUY',
    );
    tradeA.close(Timestamp.fromMs(1704067319999), Price.from('42290.10'));

    const tradeB = Trade.create(
      randomUUID(),
      Timestamp.fromMs(1704067200000),
      Price.from('42250.10'),
      '0.02',
      'SELL',
    );
    tradeB.close(Timestamp.fromMs(1704067259999), Price.from('42240.00'));

    const runId = await repository.saveRun({
      symbol: 'BTCUSDT',
      interval: '15m',
      strategyVersion: 'fvg-bos-v1',
      config: {
        fromInterval: '1m',
        toInterval: '15m',
        riskPercent: 2,
      },
      startTimeMs: 1704067200000n,
      endTimeMs: 1704067319999n,
      metrics: {
        totalTrades: 2,
        winningTrades: 2,
        losingTrades: 0,
        winRate: '100.00',
        totalPnL: '0.8038',
        maxDrawdown: '0',
        sharpeRatio: '1.2',
        profitFactor: '99.99',
        avgWin: '0.4019',
        avgLoss: '0',
      },
      trades: [tradeA, tradeB],
    });
    createdRunIds.push(runId);

    const run = await repository.findById(runId);

    expect(run).not.toBeNull();
    expect(run).toHaveProperty('id', runId);
    expect(run).toHaveProperty('symbol', 'BTCUSDT');
    expect(run).toHaveProperty('interval', '15m');
    expect(run).toHaveProperty('strategyVersion', 'fvg-bos-v1');
    expect(run).toHaveProperty('startTime', '1704067200000');
    expect(run).toHaveProperty('endTime', '1704067319999');
    expect(run).toHaveProperty('totalTrades', 2);
    expect(run).toHaveProperty('winRate', 100);
    expect(run).toHaveProperty('config.fromInterval', '1m');
    expect(run).toHaveProperty('config.toInterval', '15m');
    expect(run?.trades).toHaveLength(2);
    expect(run?.trades[0]).toHaveProperty('entryTime', '1704067200000');
    expect(run?.trades[1]).toHaveProperty('entryTime', '1704067260000');
    expect(run?.trades[0]).toHaveProperty('status', 'closed');
  });

  it('returns null when run does not exist', async () => {
    await expect(repository.findById(randomUUID())).resolves.toBeNull();
  });
});
