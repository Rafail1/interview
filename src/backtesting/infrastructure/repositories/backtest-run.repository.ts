import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  IBacktestRunRepository,
  ListBacktestRunsInput,
  SaveBacktestRunInput,
} from 'src/backtesting/domain/interfaces/backtest-run-repository.interface';
import { PrismaService } from 'src/core/infrastructure/prisma.service';
import { BacktestRunMapper } from '../mappers/backtest-run.mapper';

@Injectable()
export class BacktestRunRepository implements IBacktestRunRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly backtestRunMapper: BacktestRunMapper,
  ) {}

  public async saveRun(input: SaveBacktestRunInput): Promise<string> {
    const signals = this.backtestRunMapper.toPersistenceSignals(input);
    const equityPoints =
      this.backtestRunMapper.toPersistenceEquityPoints(input);

    const run = await this.prisma.backtestRun.create({
      data: {
        ...this.backtestRunMapper.toPersistenceRun(input),
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
            startTime: bigint | number | string;
            endTime: bigint | number | string;
            totalTrades: number;
            winRate: number;
            totalPnL: string;
            createdAt: Date;
          }>
        >(Prisma.sql`
          SELECT
            "id",
            "symbol",
            "interval",
            "strategyVersion",
            "startTime",
            "endTime",
            "totalTrades",
            "winRate",
            "totalPnL",
            "createdAt"
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
          startTime: row.startTime.toString(),
          endTime: row.endTime.toString(),
          totalTrades: row.totalTrades,
          winRate: row.winRate,
          totalPnL: row.totalPnL,
          createdAt: row.createdAt,
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

  public async findSignalsByRunId(runId: string) {
    const run = await this.prisma.backtestRun.findUnique({
      where: { id: runId },
      select: {
        id: true,
        signals: {
          orderBy: {
            timestamp: 'asc',
          },
        },
      },
    });

    if (!run) {
      return null;
    }

    return run.signals.map((signal) =>
      this.backtestRunMapper.toDomainSignalEvent(signal),
    );
  }

  public async findEquityByRunId(runId: string) {
    const run = await this.prisma.backtestRun.findUnique({
      where: { id: runId },
      select: {
        id: true,
        equityPoints: {
          orderBy: {
            timestamp: 'asc',
          },
        },
      },
    });

    if (!run) {
      return null;
    }

    return run.equityPoints.map((point) =>
      this.backtestRunMapper.toDomainEquityPoint(point),
    );
  }
}
