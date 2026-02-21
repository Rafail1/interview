import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  BacktestActiveRunView,
  BacktestEquityPointPersistenceInput,
  BacktestSignalPersistenceInput,
  FinalizeBacktestRunInput,
  GetBacktestRunSeriesInput,
  IBacktestRunRepository,
  ListBacktestRunsInput,
  SaveBacktestRunInput,
  StartBacktestRunInput,
} from 'src/backtesting/domain/interfaces/backtest-run-repository.interface';
import { PrismaService } from 'src/core/infrastructure/prisma.service';
import { BacktestRunMapper } from '../mappers/backtest-run.mapper';

@Injectable()
export class BacktestRunRepository implements IBacktestRunRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly backtestRunMapper: BacktestRunMapper,
  ) {}

  public async startRun(input: StartBacktestRunInput): Promise<string> {
    const run = await this.prisma.backtestRun.create({
      data: {
        ...this.backtestRunMapper.toPersistenceRun({
          ...input,
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
        }),
        status: 'running',
        errorMessage: null,
        processedCandles: 0,
        generatedSignals: 0,
        cancelRequestedAt: null,
      },
      select: { id: true },
    });

    return run.id;
  }

  public async appendSignals(
    runId: string,
    signals: BacktestSignalPersistenceInput[],
  ): Promise<void> {
    if (signals.length === 0) {
      return;
    }

    await this.prisma.signalEvent.createMany({
      data: this.backtestRunMapper
        .toPersistenceSignalsBatch(signals)
        .map((signal) => ({
          ...signal,
          backtestRunId: runId,
        })),
    });
  }

  public async appendEquityPoints(
    runId: string,
    points: BacktestEquityPointPersistenceInput[],
  ): Promise<void> {
    if (points.length === 0) {
      return;
    }

    await this.prisma.equityPoint.createMany({
      data: this.backtestRunMapper
        .toPersistenceEquityPointsBatch(points)
        .map((point) => ({
          ...point,
          backtestRunId: runId,
        })),
    });
  }

  public async cancelRun(runId: string): Promise<boolean> {
    const result = await this.prisma.backtestRun.updateMany({
      where: {
        id: runId,
        status: {
          in: ['pending', 'running'],
        },
      },
      data: {
        status: 'cancelled',
        errorMessage: null,
        cancelRequestedAt: new Date(),
      },
    });

    if (result.count > 0) {
      return true;
    }

    const run = await this.prisma.backtestRun.findUnique({
      where: { id: runId },
      select: { id: true },
    });
    return run !== null;
  }

  public async isRunCancelled(runId: string): Promise<boolean> {
    const run = await this.prisma.backtestRun.findUnique({
      where: { id: runId },
      select: { status: true },
    });

    return run?.status === 'cancelled';
  }

  public async updateRunProgress(
    runId: string,
    processedCandles: number,
    generatedSignals: number,
  ): Promise<void> {
    await this.prisma.backtestRun.update({
      where: { id: runId },
      data: {
        processedCandles,
        generatedSignals,
      },
    });
  }

  public async finalizeRun(input: FinalizeBacktestRunInput): Promise<void> {
    const tradeRows = this.backtestRunMapper.toPersistenceTradesBatch(
      input.trades,
    );

    await this.prisma.$transaction([
      this.prisma.backtestRun.update({
        where: { id: input.runId },
        data: {
          status: 'completed',
          errorMessage: null,
          cancelRequestedAt: null,
          processedCandles: input.processedCandles,
          generatedSignals: input.generatedSignals,
          totalTrades: input.metrics.totalTrades,
          winningTrades: input.metrics.winningTrades,
          losingTrades: input.metrics.losingTrades,
          winRate: Number(input.metrics.winRate),
          totalPnL: input.metrics.totalPnL,
          maxDrawdown: input.metrics.maxDrawdown,
          sharpeRatio: Number(input.metrics.sharpeRatio),
          profitFactor: Number(input.metrics.profitFactor),
          avgWin: input.metrics.avgWin,
          avgLoss: input.metrics.avgLoss,
        },
      }),
      ...(tradeRows.length > 0
        ? [
            this.prisma.backtestTrade.createMany({
              data: tradeRows.map((trade) => ({
                ...trade,
                backtestRunId: input.runId,
              })),
            }),
          ]
        : []),
    ]);
  }

  public async failRun(runId: string, errorMessage: string): Promise<void> {
    await this.prisma.backtestRun.update({
      where: { id: runId },
      data: {
        status: 'failed',
        errorMessage,
      },
    });
  }

  public async saveRun(input: SaveBacktestRunInput): Promise<string> {
    const signals = this.backtestRunMapper.toPersistenceSignals(input);
    const equityPoints =
      this.backtestRunMapper.toPersistenceEquityPoints(input);

    const run = await this.prisma.backtestRun.create({
      data: {
        ...this.backtestRunMapper.toPersistenceRun(input),
        status: 'completed',
        errorMessage: null,
        processedCandles: 0,
        generatedSignals: 0,
        cancelRequestedAt: null,
        trades: {
          create: this.backtestRunMapper.toPersistenceTrades(input),
        },
        ...(signals.length > 0
          ? {
              signals: {
                create: signals,
              },
            }
          : {}),
        ...(equityPoints.length > 0
          ? {
              equityPoints: {
                create: equityPoints,
              },
            }
          : {}),
      },
      select: { id: true },
    });

    return run.id;
  }

  public async findById(runId: string) {
    const run = await this.prisma.backtestRun.findUnique({
      where: { id: runId },
      include: {
        _count: {
          select: {
            signals: true,
            equityPoints: true,
          },
        },
        signals: {
          select: {
            timestamp: true,
            signalType: true,
            metadata: true,
          },
        },
        trades: {
          orderBy: {
            entryTime: 'asc',
          },
        },
      },
    });

    if (!run) {
      return null;
    }

    return this.backtestRunMapper.toDomainRun(run);
  }

  public async findSummaryById(runId: string) {
    const run = await this.prisma.backtestRun.findUnique({
      where: { id: runId },
      include: {
        _count: {
          select: {
            signals: true,
            equityPoints: true,
          },
        },
        equityPoints: {
          orderBy: {
            timestamp: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!run) {
      return null;
    }

    return this.backtestRunMapper.toDomainRunSummary(run);
  }

  public async listRuns(input: ListBacktestRunsInput) {
    const where = {
      ...(input.symbol ? { symbol: input.symbol } : {}),
      ...(input.interval ? { interval: input.interval } : {}),
      ...(input.fromDate || input.toDate
        ? {
            createdAt: {
              ...(input.fromDate ? { gte: input.fromDate } : {}),
              ...(input.toDate ? { lte: input.toDate } : {}),
            },
          }
        : {}),
    };

    const skip = (input.page - 1) * input.limit;

    if (input.sortBy === 'totalPnL') {
      const conditions: Prisma.Sql[] = [];
      if (input.symbol) {
        conditions.push(Prisma.sql`"symbol" = ${input.symbol}`);
      }
      if (input.interval) {
        conditions.push(Prisma.sql`"interval" = ${input.interval}`);
      }
      if (input.fromDate) {
        conditions.push(Prisma.sql`"createdAt" >= ${input.fromDate}`);
      }
      if (input.toDate) {
        conditions.push(Prisma.sql`"createdAt" <= ${input.toDate}`);
      }

      const whereSql =
        conditions.length > 0
          ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
          : Prisma.empty;
      const sortDirection =
        input.sortOrder === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;

      const [total, rows] = await this.prisma.$transaction([
        this.prisma.backtestRun.count({ where }),
        this.prisma.$queryRaw<
          Array<{
            id: string;
            symbol: string;
            interval: string;
            strategyVersion: string;
            status: string;
            errorMessage: string | null;
            processedCandles: number;
            generatedSignals: number;
            cancelRequestedAt: Date | null;
            startTime: bigint | number | string;
            endTime: bigint | number | string;
            totalTrades: number;
            winRate: number;
            totalPnL: string;
            createdAt: Date;
            updatedAt: Date;
          }>
        >(Prisma.sql`
          SELECT
            "id",
            "symbol",
            "interval",
            "strategyVersion",
            "status",
            "errorMessage",
            "processedCandles",
            "generatedSignals",
            "cancelRequestedAt",
            "startTime",
            "endTime",
            "totalTrades",
            "winRate",
            "totalPnL",
            "createdAt"
            ,"updatedAt"
          FROM "backtest_runs"
          ${whereSql}
          ORDER BY CAST("totalPnL" AS DOUBLE PRECISION) ${sortDirection}, "createdAt" DESC
          OFFSET ${skip}
          LIMIT ${input.limit}
        `),
      ]);

      return {
        items: rows.map((row) => ({
          id: row.id,
          symbol: row.symbol,
          interval: row.interval,
          strategyVersion: row.strategyVersion,
          status: row.status as
            | 'pending'
            | 'running'
            | 'completed'
            | 'failed'
            | 'cancelled',
          errorMessage: row.errorMessage,
          processedCandles: row.processedCandles,
          generatedSignals: row.generatedSignals,
          cancelRequestedAt: row.cancelRequestedAt,
          startTime: row.startTime.toString(),
          endTime: row.endTime.toString(),
          totalTrades: row.totalTrades,
          winRate: row.winRate,
          totalPnL: row.totalPnL,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        })),
        page: input.page,
        limit: input.limit,
        total,
      };
    }

    const orderBy =
      input.sortBy === 'createdAt'
        ? { createdAt: input.sortOrder }
        : { winRate: input.sortOrder };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.backtestRun.count({ where }),
      this.prisma.backtestRun.findMany({
        where,
        orderBy,
        skip,
        take: input.limit,
      }),
    ]);

    return {
      items: rows.map((row) => this.backtestRunMapper.toDomainRunListItem(row)),
      page: input.page,
      limit: input.limit,
      total,
    };
  }

  public async findSignalsByRunId(input: GetBacktestRunSeriesInput) {
    const run = await this.prisma.backtestRun.findUnique({
      where: { id: input.runId },
      select: { id: true },
    });

    if (!run) {
      return null;
    }

    const baseWhere = {
      backtestRunId: input.runId,
      ...(input.fromTs !== undefined || input.toTs !== undefined
        ? {
            timestamp: {
              ...(input.fromTs !== undefined ? { gte: input.fromTs } : {}),
              ...(input.toTs !== undefined ? { lte: input.toTs } : {}),
            },
          }
        : {}),
    };
    const where =
      input.cursorTs !== undefined && input.cursorId
        ? {
            AND: [
              baseWhere,
              {
                OR: [
                  { timestamp: { gt: input.cursorTs } },
                  {
                    AND: [
                      { timestamp: input.cursorTs },
                      { id: { gt: input.cursorId } },
                    ],
                  },
                ],
              },
            ],
          }
        : baseWhere;
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.signalEvent.count({ where: baseWhere }),
      this.prisma.signalEvent.findMany({
        where,
        orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
        take: input.limit + 1,
      }),
    ]);
    const hasMore = rows.length > input.limit;
    const items = hasMore ? rows.slice(0, input.limit) : rows;
    const lastItem = items[items.length - 1];

    return {
      items: items.map((signal) =>
        this.backtestRunMapper.toDomainSignalEvent(signal),
      ),
      limit: input.limit,
      total,
      nextCursor: hasMore
        ? `${lastItem.timestamp.toString()}:${lastItem.id}`
        : null,
    };
  }

  public async findEquityByRunId(input: GetBacktestRunSeriesInput) {
    const run = await this.prisma.backtestRun.findUnique({
      where: { id: input.runId },
      select: { id: true },
    });

    if (!run) {
      return null;
    }

    const baseWhere = {
      backtestRunId: input.runId,
      ...(input.fromTs !== undefined || input.toTs !== undefined
        ? {
            timestamp: {
              ...(input.fromTs !== undefined ? { gte: input.fromTs } : {}),
              ...(input.toTs !== undefined ? { lte: input.toTs } : {}),
            },
          }
        : {}),
    };
    const where =
      input.cursorTs !== undefined && input.cursorId
        ? {
            AND: [
              baseWhere,
              {
                OR: [
                  { timestamp: { gt: input.cursorTs } },
                  {
                    AND: [
                      { timestamp: input.cursorTs },
                      { id: { gt: input.cursorId } },
                    ],
                  },
                ],
              },
            ],
          }
        : baseWhere;
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.equityPoint.count({ where: baseWhere }),
      this.prisma.equityPoint.findMany({
        where,
        orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
        take: input.limit + 1,
      }),
    ]);
    const hasMore = rows.length > input.limit;
    const items = hasMore ? rows.slice(0, input.limit) : rows;
    const lastItem = items[items.length - 1];

    return {
      items: items.map((point) =>
        this.backtestRunMapper.toDomainEquityPoint(point),
      ),
      limit: input.limit,
      total,
      nextCursor: hasMore
        ? `${lastItem.timestamp.toString()}:${lastItem.id}`
        : null,
    };
  }

  public async listActiveRuns(): Promise<BacktestActiveRunView[]> {
    const runs = await this.prisma.backtestRun.findMany({
      where: {
        status: {
          in: ['pending', 'running'],
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        id: true,
        symbol: true,
        interval: true,
        strategyVersion: true,
        status: true,
        processedCandles: true,
        generatedSignals: true,
        startTime: true,
        endTime: true,
        createdAt: true,
        updatedAt: true,
        cancelRequestedAt: true,
      },
    });

    return runs.map((run) => ({
      id: run.id,
      symbol: run.symbol,
      interval: run.interval,
      strategyVersion: run.strategyVersion,
      status: run.status as BacktestActiveRunView['status'],
      processedCandles: run.processedCandles,
      generatedSignals: run.generatedSignals,
      startTime: run.startTime.toString(),
      endTime: run.endTime.toString(),
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
      cancelRequestedAt: run.cancelRequestedAt,
    }));
  }
}
