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
      signals: [
        {
          timestampMs: 1704067200000n,
          signalType: 'BUY',
          reason: 'test_buy',
          price: '42250.10',
          metadata: { source: 'integration' },
        },
      ],
      equityPoints: [
        {
          timestampMs: 1704067200000n,
          equity: '10000',
          drawdown: '0',
        },
      ],
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

    await expect(
      prisma.signalEvent.count({ where: { backtestRunId: runId } }),
    ).resolves.toBe(1);
    await expect(
      prisma.equityPoint.count({ where: { backtestRunId: runId } }),
    ).resolves.toBe(1);
  });

  it('returns null when run does not exist', async () => {
    await expect(repository.findById(randomUUID())).resolves.toBeNull();
  });

  it('sorts listRuns by totalPnL numerically', async () => {
    const symbol = `TST${Date.now()}`;

    const runIds = await Promise.all([
      repository.saveRun({
        symbol,
        interval: '15m',
        strategyVersion: 'fvg-bos-v1',
        config: {},
        startTimeMs: 1704067200000n,
        endTimeMs: 1704067319999n,
        metrics: {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: '0',
          totalPnL: '100.10',
          maxDrawdown: '0',
          sharpeRatio: '0',
          profitFactor: '0',
          avgWin: '0',
          avgLoss: '0',
        },
        trades: [],
      }),
      repository.saveRun({
        symbol,
        interval: '15m',
        strategyVersion: 'fvg-bos-v1',
        config: {},
        startTimeMs: 1704067200000n,
        endTimeMs: 1704067319999n,
        metrics: {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: '0',
          totalPnL: '9.25',
          maxDrawdown: '0',
          sharpeRatio: '0',
          profitFactor: '0',
          avgWin: '0',
          avgLoss: '0',
        },
        trades: [],
      }),
      repository.saveRun({
        symbol,
        interval: '15m',
        strategyVersion: 'fvg-bos-v1',
        config: {},
        startTimeMs: 1704067200000n,
        endTimeMs: 1704067319999n,
        metrics: {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: '0',
          totalPnL: '-1.5',
          maxDrawdown: '0',
          sharpeRatio: '0',
          profitFactor: '0',
          avgWin: '0',
          avgLoss: '0',
        },
        trades: [],
      }),
    ]);
    createdRunIds.push(...runIds);

    const asc = await repository.listRuns({
      sortBy: 'totalPnL',
      sortOrder: 'asc',
      symbol,
      page: 1,
      limit: 10,
    });
    const desc = await repository.listRuns({
      sortBy: 'totalPnL',
      sortOrder: 'desc',
      symbol,
      page: 1,
      limit: 10,
    });

    expect(asc.items.map((item) => item.totalPnL)).toEqual([
      '-1.5',
      '9.25',
      '100.10',
    ]);
    expect(desc.items.map((item) => item.totalPnL)).toEqual([
      '100.10',
      '9.25',
      '-1.5',
    ]);
  });

  it('reads signals by run id in ascending timestamp order', async () => {
    const runId = await repository.saveRun({
      symbol: 'BTCUSDT',
      interval: '15m',
      strategyVersion: 'fvg-bos-v1',
      config: {},
      startTimeMs: 1704067200000n,
      endTimeMs: 1704067319999n,
      metrics: {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: '0',
        totalPnL: '0',
        maxDrawdown: '0',
        sharpeRatio: '0',
        profitFactor: '0',
        avgWin: '0',
        avgLoss: '0',
      },
      trades: [],
      signals: [
        {
          timestampMs: 1704067260000n,
          signalType: 'SELL',
          reason: 'later_signal',
          price: '42280.50',
          metadata: { order: 2 },
        },
        {
          timestampMs: 1704067200000n,
          signalType: 'BUY',
          reason: 'earlier_signal',
          price: '42250.10',
          metadata: { order: 1 },
        },
      ],
    });
    createdRunIds.push(runId);

    const signals = await repository.findSignalsByRunId({
      runId,
      page: 1,
      limit: 10,
    });

    expect(signals).not.toBeNull();
    expect(signals).toHaveProperty('total', 2);
    expect(signals?.items).toHaveLength(2);
    expect(signals?.items[0]).toEqual(
      expect.objectContaining({
        timestamp: '1704067200000',
        signalType: 'BUY',
        reason: 'earlier_signal',
        price: '42250.10',
      }),
    );
    expect(signals?.items[1]).toEqual(
      expect.objectContaining({
        timestamp: '1704067260000',
        signalType: 'SELL',
        reason: 'later_signal',
        price: '42280.50',
      }),
    );
    expect(signals?.items[0].metadata).toEqual({ order: 1 });
  });

  it('reads equity points by run id in ascending timestamp order', async () => {
    const runId = await repository.saveRun({
      symbol: 'BTCUSDT',
      interval: '15m',
      strategyVersion: 'fvg-bos-v1',
      config: {},
      startTimeMs: 1704067200000n,
      endTimeMs: 1704067319999n,
      metrics: {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: '0',
        totalPnL: '0',
        maxDrawdown: '0',
        sharpeRatio: '0',
        profitFactor: '0',
        avgWin: '0',
        avgLoss: '0',
      },
      trades: [],
      equityPoints: [
        {
          timestampMs: 1704067260000n,
          equity: '10025.50',
          drawdown: '0',
        },
        {
          timestampMs: 1704067200000n,
          equity: '10000',
          drawdown: '0',
        },
      ],
    });
    createdRunIds.push(runId);

    const equityPoints = await repository.findEquityByRunId({
      runId,
      page: 1,
      limit: 10,
    });

    expect(equityPoints).not.toBeNull();
    expect(equityPoints).toHaveProperty('total', 2);
    expect(equityPoints?.items).toHaveLength(2);
    expect(equityPoints?.items[0]).toEqual(
      expect.objectContaining({
        timestamp: '1704067200000',
        equity: '10000',
        drawdown: '0',
      }),
    );
    expect(equityPoints?.items[1]).toEqual(
      expect.objectContaining({
        timestamp: '1704067260000',
        equity: '10025.50',
        drawdown: '0',
      }),
    );
  });
});
