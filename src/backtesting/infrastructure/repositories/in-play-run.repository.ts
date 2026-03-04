import { Injectable } from '@nestjs/common';
import {
  CreateInPlayRunInput,
  IInPlayRunRepository,
  InPlayRangeView,
  InPlayRunView,
  SaveInPlayRangeInput,
} from 'src/backtesting/domain/interfaces/in-play-run-repository.interface';
import { PrismaService } from 'src/core/infrastructure/prisma.service';

@Injectable()
export class InPlayRunRepository implements IInPlayRunRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async createRun(input: CreateInPlayRunInput): Promise<InPlayRunView> {
    const run = await this.prisma.inPlayRun.create({
      data: {
        interval: input.interval,
        startTime: input.startTime,
        endTime: input.endTime,
        symbols: input.symbols ?? null,
        windowSize: input.windowSize,
        quoteVolumeThreshold: input.quoteVolumeThreshold,
        volatilityThreshold: input.volatilityThreshold,
      },
    });
    return this.toRunView(run);
  }

  public async findRunById(runId: string): Promise<InPlayRunView | null> {
    const run = await this.prisma.inPlayRun.findUnique({
      where: { id: runId },
    });
    if (!run) {
      return null;
    }
    return this.toRunView(run);
  }

  public async listResumableRuns(limit: number): Promise<string[]> {
    const rows = await this.prisma.inPlayRun.findMany({
      where: {
        status: { in: ['pending', 'running'] },
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    return rows.map((row) => row.id);
  }

  public async markRunning(runId: string): Promise<void> {
    await this.prisma.inPlayRun.update({
      where: { id: runId },
      data: {
        status: 'running',
        startedAt: new Date(),
        errorMessage: null,
      },
    });
  }

  public async markCompleted(runId: string): Promise<void> {
    await this.prisma.inPlayRun.update({
      where: { id: runId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });
  }

  public async markFailed(runId: string, message: string): Promise<void> {
    await this.prisma.inPlayRun.update({
      where: { id: runId },
      data: {
        status: 'failed',
        errorMessage: message,
        completedAt: new Date(),
      },
    });
  }

  public async setTotalSymbols(runId: string, total: number): Promise<void> {
    await this.prisma.inPlayRun.update({
      where: { id: runId },
      data: { totalSymbols: total },
    });
  }

  public async incrementProcessedSymbols(runId: string): Promise<void> {
    await this.prisma.inPlayRun.update({
      where: { id: runId },
      data: {
        processedSymbols: { increment: 1 },
      },
    });
  }

  public async addRanges(
    runId: string,
    ranges: SaveInPlayRangeInput[],
  ): Promise<void> {
    if (ranges.length === 0) {
      return;
    }
    await this.prisma.$transaction([
      this.prisma.inPlayRange.createMany({
        data: ranges.map((range) => ({
          runId,
          symbol: range.symbol,
          interval: range.interval,
          startTime: range.startTime,
          endTime: range.endTime,
          lowPrice: range.lowPrice,
          highPrice: range.highPrice,
          activeWindows: range.activeWindows,
          avgQuoteVolume: range.avgQuoteVolume,
          maxVolatilityPercent: range.maxVolatilityPercent,
        })),
      }),
      this.prisma.inPlayRun.update({
        where: { id: runId },
        data: {
          rangesCount: { increment: ranges.length },
        },
      }),
    ]);
  }

  public async listRanges(
    runId: string,
    symbol?: string,
  ): Promise<InPlayRangeView[] | null> {
    const run = await this.prisma.inPlayRun.findUnique({
      where: { id: runId },
      select: { id: true },
    });
    if (!run) {
      return null;
    }
    const rows = await this.prisma.inPlayRange.findMany({
      where: {
        runId,
        ...(symbol ? { symbol } : {}),
      },
      orderBy: [{ symbol: 'asc' }, { startTime: 'asc' }],
    });
    return rows.map((row) => ({
      id: row.id,
      runId: row.runId,
      symbol: row.symbol,
      interval: row.interval,
      startTime: row.startTime.toString(),
      endTime: row.endTime.toString(),
      lowPrice: row.lowPrice,
      highPrice: row.highPrice,
      activeWindows: row.activeWindows,
      avgQuoteVolume: row.avgQuoteVolume,
      maxVolatilityPercent: row.maxVolatilityPercent,
      createdAt: row.createdAt,
    }));
  }

  private toRunView(row: any): InPlayRunView {
    return {
      id: row.id,
      status: row.status,
      errorMessage: row.errorMessage,
      interval: row.interval,
      startTime: row.startTime.toString(),
      endTime: row.endTime.toString(),
      symbols: Array.isArray(row.symbols) ? row.symbols : null,
      windowSize: row.windowSize,
      quoteVolumeThreshold: row.quoteVolumeThreshold,
      volatilityThreshold: row.volatilityThreshold,
      totalSymbols: row.totalSymbols,
      processedSymbols: row.processedSymbols,
      rangesCount: row.rangesCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
    };
  }
}
