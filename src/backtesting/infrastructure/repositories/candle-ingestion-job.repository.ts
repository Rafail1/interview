import { Injectable } from '@nestjs/common';
import {
  CandleIngestionJobView,
  CandleIngestionSymbolRunView,
  CreateCandleIngestionJobInput,
  ICandleIngestionJobRepository,
} from 'src/backtesting/domain/interfaces/candle-ingestion-job-repository.interface';
import { PrismaService } from 'src/core/infrastructure/prisma.service';

@Injectable()
export class CandleIngestionJobRepository implements ICandleIngestionJobRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async createJob(
    input: CreateCandleIngestionJobInput,
  ): Promise<CandleIngestionJobView> {
    const prisma = this.prisma;
    const job = await prisma.candleIngestionJob.create({
      data: {
        mode: input.mode,
        status: 'pending',
        interval: input.interval,
        backfillCandles: input.backfillCandles,
        configHash: input.configHash,
        freshnessTargetMs: input.freshnessTargetMs ?? null,
      },
    });
    return this.toView(job);
  }

  public async findById(jobId: string): Promise<CandleIngestionJobView | null> {
    const prisma = this.prisma;
    const job = await prisma.candleIngestionJob.findUnique({
      where: { id: jobId },
    });
    if (!job) {
      return null;
    }
    return this.toView(job);
  }

  public async markRunning(jobId: string): Promise<void> {
    const prisma = this.prisma;
    await prisma.candleIngestionJob.update({
      where: { id: jobId },
      data: {
        status: 'running',
        startedAt: new Date(),
        errorMessage: null,
      },
    });
  }

  public async markCompleted(
    jobId: string,
    status: 'completed' | 'completed_with_errors',
  ): Promise<void> {
    const prisma = this.prisma;
    await prisma.candleIngestionJob.update({
      where: { id: jobId },
      data: {
        status,
        completedAt: new Date(),
      },
    });
  }

  public async markFailed(jobId: string, errorMessage: string): Promise<void> {
    const prisma = this.prisma;
    await prisma.candleIngestionJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errorMessage,
        completedAt: new Date(),
      },
    });
  }

  public async markCancelled(jobId: string): Promise<void> {
    const prisma = this.prisma;
    await prisma.candleIngestionJob.update({
      where: { id: jobId },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
      },
    });
  }

  public async requestCancel(jobId: string): Promise<boolean> {
    const prisma = this.prisma;
    const result = await prisma.candleIngestionJob.updateMany({
      where: {
        id: jobId,
        status: { in: ['pending', 'running'] },
      },
      data: {
        cancelRequestedAt: new Date(),
      },
    });
    if (result.count > 0) {
      return true;
    }

    const exists = await prisma.candleIngestionJob.findUnique({
      where: { id: jobId },
      select: { id: true },
    });
    return exists !== null;
  }

  public async setSymbolsTotal(jobId: string, total: number): Promise<void> {
    const prisma = this.prisma;
    await prisma.candleIngestionJob.update({
      where: { id: jobId },
      data: {
        symbolsTotal: total,
      },
    });
  }

  public async incrementCompleted(jobId: string): Promise<void> {
    const prisma = this.prisma;
    await prisma.candleIngestionJob.update({
      where: { id: jobId },
      data: {
        symbolsCompleted: { increment: 1 },
      },
    });
  }

  public async incrementFailed(jobId: string): Promise<void> {
    const prisma = this.prisma;
    await prisma.candleIngestionJob.update({
      where: { id: jobId },
      data: {
        symbolsFailed: { increment: 1 },
      },
    });
  }

  public async incrementSkipped(jobId: string): Promise<void> {
    const prisma = this.prisma;
    await prisma.candleIngestionJob.update({
      where: { id: jobId },
      data: {
        symbolsSkipped: { increment: 1 },
      },
    });
  }

  public async upsertSymbolRun(
    jobId: string,
    symbol: string,
    interval: string,
    data: {
      status: 'running' | 'completed' | 'failed' | 'skipped';
      errorMessage?: string | null;
      fromOpenTime?: bigint | null;
      toOpenTime?: bigint | null;
      lastSyncedOpenTime?: bigint | null;
      processedCandles?: number;
      insertedCandles?: number;
      updatedCandles?: number;
      retries?: number;
      startedAt?: Date | null;
      completedAt?: Date | null;
    },
  ): Promise<void> {
    const prisma = this.prisma;
    await prisma.candleIngestionSymbolRun.upsert({
      where: {
        jobId_symbol_interval: {
          jobId,
          symbol,
          interval,
        },
      },
      create: {
        jobId,
        symbol,
        interval,
        status: data.status,
        errorMessage: data.errorMessage ?? null,
        fromOpenTime: data.fromOpenTime ?? null,
        toOpenTime: data.toOpenTime ?? null,
        lastSyncedOpenTime: data.lastSyncedOpenTime ?? null,
        processedCandles: data.processedCandles ?? 0,
        insertedCandles: data.insertedCandles ?? 0,
        updatedCandles: data.updatedCandles ?? 0,
        retries: data.retries ?? 0,
        startedAt: data.startedAt ?? null,
        completedAt: data.completedAt ?? null,
      },
      update: {
        status: data.status,
        errorMessage: data.errorMessage ?? null,
        fromOpenTime: data.fromOpenTime ?? undefined,
        toOpenTime: data.toOpenTime ?? undefined,
        lastSyncedOpenTime: data.lastSyncedOpenTime ?? undefined,
        processedCandles: data.processedCandles ?? undefined,
        insertedCandles: data.insertedCandles ?? undefined,
        updatedCandles: data.updatedCandles ?? undefined,
        retries: data.retries ?? undefined,
        startedAt: data.startedAt ?? undefined,
        completedAt: data.completedAt ?? undefined,
      },
    });
  }

  public async findSymbolRunsByJobId(
    jobId: string,
  ): Promise<CandleIngestionSymbolRunView[] | null> {
    const prisma = this.prisma;
    const job = await prisma.candleIngestionJob.findUnique({
      where: { id: jobId },
      select: { id: true },
    });
    if (!job) {
      return null;
    }

    const rows = await prisma.candleIngestionSymbolRun.findMany({
      where: { jobId },
      orderBy: [{ symbol: 'asc' }, { createdAt: 'asc' }],
    });

    return rows.map((row: any) => ({
      id: row.id,
      jobId: row.jobId,
      symbol: row.symbol,
      interval: row.interval,
      status: row.status,
      errorMessage: row.errorMessage,
      fromOpenTime:
        row.fromOpenTime === null ? null : row.fromOpenTime.toString(),
      toOpenTime: row.toOpenTime === null ? null : row.toOpenTime.toString(),
      lastSyncedOpenTime:
        row.lastSyncedOpenTime === null
          ? null
          : row.lastSyncedOpenTime.toString(),
      processedCandles: row.processedCandles,
      insertedCandles: row.insertedCandles,
      updatedCandles: row.updatedCandles,
      retries: row.retries,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
    }));
  }

  private toView(job: any): CandleIngestionJobView {
    return {
      id: job.id,
      mode: job.mode,
      status: job.status,
      errorMessage: job.errorMessage,
      interval: job.interval,
      backfillCandles: job.backfillCandles,
      symbolsTotal: job.symbolsTotal,
      symbolsCompleted: job.symbolsCompleted,
      symbolsFailed: job.symbolsFailed,
      symbolsSkipped: job.symbolsSkipped,
      configHash: job.configHash,
      freshnessTargetMs:
        job.freshnessTargetMs === null ? null : job.freshnessTargetMs.toString(),
      cancelRequestedAt: job.cancelRequestedAt,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    };
  }
}
