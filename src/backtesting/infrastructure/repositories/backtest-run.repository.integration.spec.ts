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
    expect(run).toHaveProperty('status', 'completed');
    expect(run).toHaveProperty('errorMessage', null);
    expect(run).toHaveProperty('startTime', '1704067200000');
    expect(run).toHaveProperty('endTime', '1704067319999');
    expect(run).toHaveProperty('totalTrades', 2);
    expect(run).toHaveProperty('winRate', 100);
    expect(run).toHaveProperty('signalsCount', 1);
    expect(run).toHaveProperty('equityPointsCount', 1);
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

  it('persists run via startRun + append + finalize flow', async () => {
    const trade = Trade.create(
      randomUUID(),
      Timestamp.fromMs(1704067200000),
      Price.from('42250.10'),
      '0.02',
      'BUY',
    );
    trade.close(Timestamp.fromMs(1704067259999), Price.from('42270.00'));

    const runId = await repository.startRun({
      symbol: 'BTCUSDT',
      interval: '15m',
      strategyVersion: 'fvg-bos-v1',
      config: {
        fromInterval: '1m',
        toInterval: '15m',
      },
      startTimeMs: 1704067200000n,
      endTimeMs: 1704067319999n,
    });
    createdRunIds.push(runId);

    await repository.appendSignals(runId, [
      {
        timestampMs: 1704067200000n,
        signalType: 'BUY',
        reason: 'step_flow_signal',
        price: '42250.10',
        metadata: { source: 'start-append-finalize' },
      },
    ]);
    await repository.appendEquityPoints(runId, [
      {
        timestampMs: 1704067200000n,
        equity: '10000',
        drawdown: '0',
      },
      {
        timestampMs: 1704067259999n,
        equity: '10019.9',
        drawdown: '0',
      },
    ]);
    await repository.finalizeRun({
      runId,
      processedCandles: 120,
      generatedSignals: 8,
      metrics: {
        totalTrades: 1,
        winningTrades: 1,
        losingTrades: 0,
        winRate: '100',
        totalPnL: '19.9',
        maxDrawdown: '0',
        sharpeRatio: '0.5',
        profitFactor: '99.99',
        avgWin: '19.9',
        avgLoss: '0',
      },
      trades: [trade],
    });

    const run = await repository.findById(runId);

    expect(run).not.toBeNull();
    expect(run).toHaveProperty('id', runId);
    expect(run).toHaveProperty('status', 'completed');
    expect(run).toHaveProperty('errorMessage', null);
    expect(run).toHaveProperty('processedCandles', 120);
    expect(run).toHaveProperty('generatedSignals', 8);
    expect(run).toHaveProperty('totalTrades', 1);
    expect(run).toHaveProperty('signalsCount', 1);
    expect(run).toHaveProperty('equityPointsCount', 2);
    expect(run?.trades).toHaveLength(1);

    await expect(
      prisma.signalEvent.count({ where: { backtestRunId: runId } }),
    ).resolves.toBe(1);
    await expect(
      prisma.equityPoint.count({ where: { backtestRunId: runId } }),
    ).resolves.toBe(2);
    await expect(
      prisma.backtestTrade.count({ where: { backtestRunId: runId } }),
    ).resolves.toBe(1);
  });

  it('returns null when run does not exist', async () => {
    await expect(repository.findById(randomUUID())).resolves.toBeNull();
  });

  it('marks run as failed and stores error message', async () => {
    const runId = await repository.startRun({
      symbol: 'BTCUSDT',
      interval: '15m',
      strategyVersion: 'fvg-bos-v1',
      config: {
        fromInterval: '1m',
        toInterval: '15m',
      },
      startTimeMs: 1704067200000n,
      endTimeMs: 1704067319999n,
    });
    createdRunIds.push(runId);

    await repository.failRun(runId, 'simulated failure');
    const run = await repository.findById(runId);

    expect(run).not.toBeNull();
    expect(run).toHaveProperty('status', 'failed');
    expect(run).toHaveProperty('errorMessage', 'simulated failure');
  });

  it('cancels a running run and reports cancelled status', async () => {
    const runId = await repository.startRun({
      symbol: 'BTCUSDT',
      interval: '15m',
      strategyVersion: 'fvg-bos-v1',
      config: {
        fromInterval: '1m',
        toInterval: '15m',
      },
      startTimeMs: 1704067200000n,
      endTimeMs: 1704067319999n,
    });
    createdRunIds.push(runId);

    await expect(repository.cancelRun(runId)).resolves.toBe(true);
    await expect(repository.isRunCancelled(runId)).resolves.toBe(true);

    const run = await repository.findById(runId);
    expect(run).not.toBeNull();
    expect(run).toHaveProperty('status', 'cancelled');
    expect(run?.cancelRequestedAt).not.toBeNull();
  });

  it('lists active runs with progress fields', async () => {
    const runId = await repository.startRun({
      symbol: 'BTCUSDT',
      interval: '15m',
      strategyVersion: 'fvg-bos-v1',
      config: {
        fromInterval: '1m',
        toInterval: '15m',
      },
      startTimeMs: 1704067200000n,
      endTimeMs: 1704067319999n,
    });
    createdRunIds.push(runId);

    await repository.updateRunProgress(runId, 2500, 73);
    const active = await repository.listActiveRuns();
    const item = active.find((entry) => entry.id === runId);

    expect(item).toBeDefined();
    expect(item).toMatchObject({
      id: runId,
      status: 'running',
      processedCandles: 2500,
      generatedSignals: 73,
    });
    expect(item?.updatedAt).toBeInstanceOf(Date);
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
      limit: 10,
    });

    expect(signals).not.toBeNull();
    expect(signals).toHaveProperty('total', 2);
    expect(signals?.items).toHaveLength(2);
    expect(signals).toHaveProperty('nextCursor', null);
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
      limit: 10,
    });

    expect(equityPoints).not.toBeNull();
    expect(equityPoints).toHaveProperty('total', 2);
    expect(equityPoints?.items).toHaveLength(2);
    expect(equityPoints).toHaveProperty('nextCursor', null);
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

  it('applies cursor windowing and timestamp range filters to signals series', async () => {
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
          timestampMs: 1704067200000n,
          signalType: 'BUY',
          reason: 's1',
          price: '1',
        },
        {
          timestampMs: 1704067260000n,
          signalType: 'SELL',
          reason: 's2',
          price: '2',
        },
        {
          timestampMs: 1704067320000n,
          signalType: 'BUY',
          reason: 's3',
          price: '3',
        },
      ],
    });
    createdRunIds.push(runId);

    const firstWindow = await repository.findSignalsByRunId({
      runId,
      limit: 1,
    });
    const [cursorTsRaw, cursorId] = (firstWindow?.nextCursor ?? '').split(':');
    const secondWindow = await repository.findSignalsByRunId({
      runId,
      limit: 1,
      cursorTs: BigInt(cursorTsRaw),
      cursorId,
    });
    const ranged = await repository.findSignalsByRunId({
      runId,
      limit: 10,
      fromTs: 1704067260000n,
      toTs: 1704067320000n,
    });

    expect(firstWindow).not.toBeNull();
    expect(firstWindow).toHaveProperty('total', 3);
    expect(firstWindow?.items).toHaveLength(1);
    expect(firstWindow?.items[0]).toHaveProperty('reason', 's1');
    expect(firstWindow?.nextCursor).toMatch(/^1704067200000:[0-9a-f-]{36}$/);

    expect(secondWindow).not.toBeNull();
    expect(secondWindow?.items).toHaveLength(1);
    expect(secondWindow?.items[0]).toHaveProperty('reason', 's2');
    expect(secondWindow?.nextCursor).toMatch(/^1704067260000:[0-9a-f-]{36}$/);

    expect(ranged).not.toBeNull();
    expect(ranged).toHaveProperty('total', 2);
    expect(ranged?.items.map((item) => item.reason)).toEqual(['s2', 's3']);
    expect(ranged).toHaveProperty('nextCursor', null);
  });

  it('applies cursor windowing and timestamp range filters to equity series', async () => {
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
          timestampMs: 1704067200000n,
          equity: '10000',
          drawdown: '0',
        },
        {
          timestampMs: 1704067260000n,
          equity: '10010',
          drawdown: '0',
        },
        {
          timestampMs: 1704067320000n,
          equity: '10005',
          drawdown: '5',
        },
      ],
    });
    createdRunIds.push(runId);

    const firstWindow = await repository.findEquityByRunId({
      runId,
      limit: 1,
    });
    const [cursorTsRaw, cursorId] = (firstWindow?.nextCursor ?? '').split(':');
    const secondWindow = await repository.findEquityByRunId({
      runId,
      limit: 1,
      cursorTs: BigInt(cursorTsRaw),
      cursorId,
    });
    const ranged = await repository.findEquityByRunId({
      runId,
      limit: 10,
      fromTs: 1704067260000n,
      toTs: 1704067320000n,
    });

    expect(firstWindow).not.toBeNull();
    expect(firstWindow).toHaveProperty('total', 3);
    expect(firstWindow?.items).toHaveLength(1);
    expect(firstWindow?.items[0]).toHaveProperty('equity', '10000');
    expect(firstWindow?.nextCursor).toMatch(/^1704067200000:[0-9a-f-]{36}$/);

    expect(secondWindow).not.toBeNull();
    expect(secondWindow?.items).toHaveLength(1);
    expect(secondWindow?.items[0]).toHaveProperty('equity', '10010');
    expect(secondWindow?.nextCursor).toMatch(/^1704067260000:[0-9a-f-]{36}$/);

    expect(ranged).not.toBeNull();
    expect(ranged).toHaveProperty('total', 2);
    expect(ranged?.items.map((item) => item.equity)).toEqual(['10010', '10005']);
    expect(ranged).toHaveProperty('nextCursor', null);
  });

  it('supports cursor pagination for signals with stable timestamp+id ordering', async () => {
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
          timestampMs: 1704067200000n,
          signalType: 'BUY',
          reason: 'c1',
          price: '1',
        },
        {
          timestampMs: 1704067260000n,
          signalType: 'SELL',
          reason: 'c2',
          price: '2',
        },
        {
          timestampMs: 1704067320000n,
          signalType: 'BUY',
          reason: 'c3',
          price: '3',
        },
      ],
    });
    createdRunIds.push(runId);

    const firstPage = await repository.findSignalsByRunId({
      runId,
      limit: 1,
    });

    expect(firstPage).not.toBeNull();
    expect(firstPage?.items[0]).toHaveProperty('reason', 'c1');
    expect(firstPage?.nextCursor).toMatch(
      /^1704067200000:[0-9a-f-]{36}$/,
    );

    const [cursorTsRaw, cursorId] = (firstPage?.nextCursor ?? '').split(':');
    const secondPage = await repository.findSignalsByRunId({
      runId,
      limit: 1,
      cursorTs: BigInt(cursorTsRaw),
      cursorId,
    });

    expect(secondPage).not.toBeNull();
    expect(secondPage?.items[0]).toHaveProperty('reason', 'c2');
  });

  it('supports cursor pagination for equity points with stable timestamp+id ordering', async () => {
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
          timestampMs: 1704067200000n,
          equity: '10000',
          drawdown: '0',
        },
        {
          timestampMs: 1704067260000n,
          equity: '10010',
          drawdown: '0',
        },
        {
          timestampMs: 1704067320000n,
          equity: '10005',
          drawdown: '5',
        },
      ],
    });
    createdRunIds.push(runId);

    const firstPage = await repository.findEquityByRunId({
      runId,
      limit: 1,
    });

    expect(firstPage).not.toBeNull();
    expect(firstPage?.items[0]).toHaveProperty('equity', '10000');
    expect(firstPage?.nextCursor).toMatch(
      /^1704067200000:[0-9a-f-]{36}$/,
    );

    const [cursorTsRaw, cursorId] = (firstPage?.nextCursor ?? '').split(':');
    const secondPage = await repository.findEquityByRunId({
      runId,
      limit: 1,
      cursorTs: BigInt(cursorTsRaw),
      cursorId,
    });

    expect(secondPage).not.toBeNull();
    expect(secondPage?.items[0]).toHaveProperty('equity', '10010');
  });

  it('reads compact summary including latest equity snapshot', async () => {
    const runId = await repository.saveRun({
      symbol: 'BTCUSDT',
      interval: '15m',
      strategyVersion: 'fvg-bos-v1',
      config: {},
      startTimeMs: 1704067200000n,
      endTimeMs: 1704067319999n,
      metrics: {
        totalTrades: 1,
        winningTrades: 1,
        losingTrades: 0,
        winRate: '100',
        totalPnL: '12.3',
        maxDrawdown: '1.5',
        sharpeRatio: '0.8',
        profitFactor: '2.4',
        avgWin: '12.3',
        avgLoss: '0',
      },
      trades: [],
      signals: [
        {
          timestampMs: 1704067200000n,
          signalType: 'BUY',
          reason: 'summary_signal',
          price: '1',
        },
      ],
      equityPoints: [
        {
          timestampMs: 1704067200000n,
          equity: '10000',
          drawdown: '0',
        },
        {
          timestampMs: 1704067319999n,
          equity: '10012.3',
          drawdown: '1.5',
        },
      ],
    });
    createdRunIds.push(runId);

    const summary = await repository.findSummaryById(runId);

    expect(summary).not.toBeNull();
    expect(summary).toHaveProperty('id', runId);
    expect(summary).toHaveProperty('status', 'completed');
    expect(summary).toHaveProperty('errorMessage', null);
    expect(summary).toHaveProperty('signalsCount', 1);
    expect(summary).toHaveProperty('equityPointsCount', 2);
    expect(summary).toHaveProperty('lastEquity', '10012.3');
    expect(summary).toHaveProperty('lastDrawdown', '1.5');
  });
});
