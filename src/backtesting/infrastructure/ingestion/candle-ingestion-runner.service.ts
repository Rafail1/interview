import axios, { AxiosInstance } from 'axios';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import {
  CANDLE_INGESTION_JOB_REPOSITORY_TOKEN,
  type CandleIngestionJobView,
  type ICandleIngestionJobRepository,
} from 'src/backtesting/domain/interfaces/candle-ingestion-job-repository.interface';
import {
  type ICandleIngestionRunner,
} from 'src/backtesting/domain/interfaces/candle-ingestion-runner.interface';
import {
  MARKET_DATA_REPOSITORY_TOKEN,
  type IMarketDataRepository,
} from 'src/backtesting/domain/interfaces/market-data-repository.interface';
import { OHLCV } from 'src/backtesting/domain/value-objects/ohlcv.value-object';
import { Timeframe } from 'src/backtesting/domain/value-objects/timeframe.value-object';
import { PrismaService } from 'src/core/infrastructure/prisma.service';
import {
  LOGGER_TOKEN,
  type ILogger,
} from 'src/core/interfaces/logger.interface';

type ExchangeInfoResponse = {
  symbols: Array<{
    symbol: string;
    status: string;
    quoteAsset: string;
  }>;
};

type BinanceKlineRow = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

@Injectable()
export class CandleIngestionRunnerService
  implements ICandleIngestionRunner, OnModuleInit
{
  private static readonly LOG_CONTEXT = 'CandleIngestionRunnerService';
  private readonly http: AxiosInstance;
  private readonly queue: string[] = [];
  private readonly queued = new Set<string>();
  private readonly running = new Set<string>();
  private readonly maxConcurrentJobs: number;
  private readonly maxConcurrentSymbols: number;
  private readonly maxRetries: number;
  private readonly maxApiConcurrency: number;
  private apiInFlight = 0;
  private apiWaiters: Array<() => void> = [];

  constructor(
    private readonly configService: ConfigService,
    @Inject(CANDLE_INGESTION_JOB_REPOSITORY_TOKEN)
    private readonly jobs: ICandleIngestionJobRepository,
    @Inject(MARKET_DATA_REPOSITORY_TOKEN)
    private readonly marketDataRepository: IMarketDataRepository,
    private readonly prisma: PrismaService,
    @Inject(LOGGER_TOKEN)
    private readonly logger: ILogger,
  ) {
    this.http = axios.create({
      baseURL: 'https://fapi.binance.com',
      timeout: 20_000,
    });
    this.maxConcurrentJobs = this.getIntConfig('INGESTION_JOB_CONCURRENCY', 1);
    this.maxConcurrentSymbols = this.getIntConfig(
      'INGESTION_SYMBOL_CONCURRENCY',
      6,
    );
    this.maxRetries = this.getIntConfig('INGESTION_RETRY_MAX', 3);
    this.maxApiConcurrency = this.getIntConfig('INGESTION_API_CONCURRENCY', 8);
  }

  public async onModuleInit(): Promise<void> {
    const prisma = this.prisma;
    const resumable = await prisma.candleIngestionJob.findMany({
      where: { status: { in: ['pending', 'running'] } },
      select: { id: true },
      take: 100,
    });
    for (const job of resumable) {
      this.enqueue(job.id);
    }
  }

  public enqueue(jobId: string): void {
    if (this.queued.has(jobId) || this.running.has(jobId)) {
      return;
    }
    this.queue.push(jobId);
    this.queued.add(jobId);
    this.schedule();
  }

  private schedule(): void {
    while (
      this.running.size < this.maxConcurrentJobs &&
      this.queue.length > 0
    ) {
      const jobId = this.queue.shift();
      if (!jobId) {
        break;
      }
      this.queued.delete(jobId);
      this.running.add(jobId);
      void this.execute(jobId).finally(() => {
        this.running.delete(jobId);
        this.schedule();
      });
    }
  }

  private async execute(jobId: string): Promise<void> {
    await this.jobs.markRunning(jobId);
    const job = await this.jobs.findById(jobId);
    if (!job) {
      return;
    }

    try {
      const symbols = await this.fetchUsdtSymbols();
      await this.jobs.setSymbolsTotal(jobId, symbols.length);

      let cursor = 0;
      const workers = Array.from({
        length: Math.min(this.maxConcurrentSymbols, symbols.length),
      }).map(async () => {
        while (true) {
          const index = cursor;
          cursor += 1;
          if (index >= symbols.length) {
            return;
          }
          const symbol = symbols[index];
          await this.processSymbolWithRetry(job, symbol);
        }
      });
      await Promise.all(workers);

      const finalJob = await this.jobs.findById(jobId);
      const hasErrors = (finalJob?.symbolsFailed ?? 0) > 0;
      await this.jobs.markCompleted(
        jobId,
        hasErrors ? 'completed_with_errors' : 'completed',
      );
      this.logger.log(
        `Completed ingestion job=${jobId} status=${hasErrors ? 'completed_with_errors' : 'completed'}`,
        CandleIngestionRunnerService.LOG_CONTEXT,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.jobs.markFailed(jobId, message);
      this.logger.error(
        `Ingestion job failed jobId=${jobId} reason=${message}`,
        undefined,
        CandleIngestionRunnerService.LOG_CONTEXT,
      );
    }
  }

  private async processSymbolWithRetry(
    job: CandleIngestionJobView,
    symbol: string,
  ): Promise<void> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        await this.processSymbol(job, symbol, attempt);
        return;
      } catch (error) {
        if (attempt === this.maxRetries) {
          const message = error instanceof Error ? error.message : String(error);
          await this.jobs.upsertSymbolRun(job.id, symbol, job.interval, {
            status: 'failed',
            errorMessage: message,
            retries: attempt,
            completedAt: new Date(),
          });
          await this.jobs.incrementFailed(job.id);
          return;
        }
        await this.sleep(Math.pow(2, attempt) * 500);
      }
    }
  }

  private async processSymbol(
    job: CandleIngestionJobView,
    symbol: string,
    attempt: number,
  ): Promise<void> {
    const timeframe = Timeframe.from(job.interval);
    const intervalMs = timeframe.toMs();
    const nowMs = Date.now();
    const latestClosedOpenTime =
      Math.floor(nowMs / intervalMs) * intervalMs - intervalMs;

    if (latestClosedOpenTime < 0) {
      await this.jobs.upsertSymbolRun(job.id, symbol, job.interval, {
        status: 'skipped',
        retries: attempt,
        completedAt: new Date(),
      });
      await this.jobs.incrementSkipped(job.id);
      return;
    }

    const prisma = this.prisma;
    const latestLocal = await prisma.marketData.findFirst({
      where: {
        symbol,
        interval: job.interval,
      },
      orderBy: { openTime: 'desc' },
      select: { openTime: true },
    });

    const rawFromOpenTime =
      job.mode === 'backfill' || latestLocal === null
        ? latestClosedOpenTime - (job.backfillCandles - 1) * intervalMs
        : Number(latestLocal.openTime) + intervalMs;
    const fromOpenTime = Math.max(0, rawFromOpenTime);

    if (fromOpenTime > latestClosedOpenTime) {
      await this.jobs.upsertSymbolRun(job.id, symbol, job.interval, {
        status: 'skipped',
        retries: attempt,
        fromOpenTime: BigInt(fromOpenTime),
        toOpenTime: BigInt(latestClosedOpenTime),
        completedAt: new Date(),
      });
      await this.jobs.incrementSkipped(job.id);
      return;
    }

    await this.jobs.upsertSymbolRun(job.id, symbol, job.interval, {
      status: 'running',
      retries: attempt,
      startedAt: new Date(),
      fromOpenTime: BigInt(fromOpenTime),
      toOpenTime: BigInt(latestClosedOpenTime),
    });

    const candles = await this.fetchMissingCandles(
      symbol,
      timeframe,
      fromOpenTime,
      latestClosedOpenTime,
      nowMs,
    );
    if (candles.length > 0) {
      await this.marketDataRepository.saveCandles(candles);
    }

    await this.jobs.upsertSymbolRun(job.id, symbol, job.interval, {
      status: 'completed',
      retries: attempt,
      processedCandles: candles.length,
      insertedCandles: candles.length,
      updatedCandles: 0,
      lastSyncedOpenTime: BigInt(latestClosedOpenTime),
      completedAt: new Date(),
      errorMessage: null,
    });
    await this.jobs.incrementCompleted(job.id);
  }

  private async fetchMissingCandles(
    symbol: string,
    timeframe: Timeframe,
    fromOpenTimeMs: number,
    toOpenTimeMs: number,
    nowMs: number,
  ): Promise<Candle[]> {
    const intervalMs = timeframe.toMs();
    const result: Candle[] = [];
    let cursor = fromOpenTimeMs;

    while (cursor <= toOpenTimeMs) {
      const endTime = Math.min(
        toOpenTimeMs + intervalMs - 1,
        cursor + intervalMs * 1500 - 1,
      );
      const rows = await this.withApiSlot(async () => {
        const response = await this.http.get<BinanceKlineRow[]>('/fapi/v1/klines', {
          params: {
            symbol,
            interval: timeframe.toString(),
            startTime: cursor,
            endTime,
            limit: 1500,
          },
        });
        return response.data;
      });

      if (!Array.isArray(rows) || rows.length === 0) {
        break;
      }

      for (const row of rows) {
        if (row[6] > nowMs) {
          continue;
        }
        result.push(
          Candle.create(
            symbol,
            timeframe,
            row[0],
            row[6],
            OHLCV.from(row[1], row[2], row[3], row[4], row[5], row[7]),
          ),
        );
      }

      const lastOpen = rows[rows.length - 1][0];
      if (!Number.isFinite(lastOpen) || lastOpen < cursor) {
        break;
      }
      cursor = lastOpen + intervalMs;
      if (rows.length < 1500) {
        break;
      }
    }

    return result;
  }

  private async fetchUsdtSymbols(): Promise<string[]> {
    const response = await this.withApiSlot(async () => {
      const result = await this.http.get<ExchangeInfoResponse>(
        '/fapi/v1/exchangeInfo',
      );
      return result.data;
    });
    return response.symbols
      .filter((item) => item.status === 'TRADING' && item.quoteAsset === 'USDT')
      .map((item) => item.symbol);
  }

  private async withApiSlot<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquireApiSlot();
    try {
      return await fn();
    } finally {
      this.releaseApiSlot();
    }
  }

  private async acquireApiSlot(): Promise<void> {
    if (this.apiInFlight < this.maxApiConcurrency) {
      this.apiInFlight += 1;
      return;
    }
    await new Promise<void>((resolve) => {
      this.apiWaiters.push(resolve);
    });
    this.apiInFlight += 1;
  }

  private releaseApiSlot(): void {
    this.apiInFlight = Math.max(0, this.apiInFlight - 1);
    const waiter = this.apiWaiters.shift();
    if (waiter) {
      waiter();
    }
  }

  private getIntConfig(key: string, fallback: number): number {
    const parsed = Number(this.configService.get<string>(key) ?? String(fallback));
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
