import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/infrastructure/prisma.service';
import { ImportJobProgress } from 'src/backtesting/domain/interfaces/download-manager.interface';

@Injectable()
export class DownloadJobRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async create(
    symbol: string,
    interval: string,
    startDate: Date,
    endDate: Date,
    totalFiles: number,
  ): Promise<string> {
    const job = await this.prisma.downloadJob.create({
      data: {
        symbol,
        interval,
        startDate,
        endDate,
        status: 'pending',
        totalFiles,
      },
    });
    return job.id;
  }

  public async markDownloading(jobId: string): Promise<void> {
    await this.prisma.downloadJob.update({
      where: { id: jobId },
      data: { status: 'downloading' },
    });
  }

  public async incrementDownloaded(
    jobId: string,
    lastSuccessfulTime: bigint,
  ): Promise<void> {
    await this.prisma.downloadJob.update({
      where: { id: jobId },
      data: {
        downloadedFiles: {
          increment: 1,
        },
        lastSuccessfulTime,
      },
    });
  }

  public async incrementFailed(jobId: string): Promise<void> {
    await this.prisma.downloadJob.update({
      where: { id: jobId },
      data: {
        failedFiles: {
          increment: 1,
        },
      },
    });
  }

  public async markCompleted(jobId: string): Promise<void> {
    await this.prisma.downloadJob.update({
      where: { id: jobId },
      data: { status: 'completed', checksumValid: true },
    });
  }

  public async markFailed(jobId: string, errorMessage: string): Promise<void> {
    await this.prisma.downloadJob.update({
      where: { id: jobId },
      data: { status: 'failed', errorMessage },
    });
  }

  public async findById(jobId: string): Promise<ImportJobProgress | null> {
    const job = await this.prisma.downloadJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return null;
    }

    return {
      jobId: job.id,
      symbol: job.symbol,
      interval: job.interval,
      status: job.status as ImportJobProgress['status'],
      queuedPosition: null,
      totalFiles: job.totalFiles,
      downloadedFiles: job.downloadedFiles,
      failedFiles: job.failedFiles,
      checksumValid: job.checksumValid,
      errorMessage: job.errorMessage,
      lastSuccessfulTime:
        job.lastSuccessfulTime === null
          ? null
          : job.lastSuccessfulTime.toString(),
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}
