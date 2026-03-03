import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  CANDLE_INGESTION_JOB_REPOSITORY_TOKEN,
  type ICandleIngestionJobRepository,
} from 'src/backtesting/domain/interfaces/candle-ingestion-job-repository.interface';
import {
  CANDLE_INGESTION_RUNNER_TOKEN,
  type ICandleIngestionRunner,
} from 'src/backtesting/domain/interfaces/candle-ingestion-runner.interface';
import { Timeframe } from 'src/backtesting/domain/value-objects/timeframe.value-object';
import { StartCandleIngestionJobRequestDto } from 'src/backtesting/interfaces/dtos/start-candle-ingestion-job-request.dto';
import { StartCandleIngestionJobResponseDto } from 'src/backtesting/interfaces/dtos/start-candle-ingestion-job-response.dto';

@Injectable()
export class StartCandleIngestionJobUseCase {
  constructor(
    @Inject(CANDLE_INGESTION_JOB_REPOSITORY_TOKEN)
    private readonly repository: ICandleIngestionJobRepository,
    @Inject(CANDLE_INGESTION_RUNNER_TOKEN)
    private readonly runner: ICandleIngestionRunner,
  ) {}

  public async execute(
    request: StartCandleIngestionJobRequestDto,
  ): Promise<StartCandleIngestionJobResponseDto> {
    Timeframe.from(request.interval);
    const backfillCandles = request.backfillCandles ?? 1000;
    const freshnessTargetMs = request.freshnessTarget
      ? BigInt(new Date(request.freshnessTarget).getTime())
      : undefined;

    const configHash = this.computeConfigHash({
      mode: request.mode,
      interval: request.interval,
      backfillCandles,
      freshnessTargetMs: freshnessTargetMs?.toString() ?? null,
    });

    const job = await this.repository.createJob({
      mode: request.mode,
      interval: request.interval,
      backfillCandles,
      configHash,
      freshnessTargetMs,
    });
    this.runner.enqueue(job.id);

    return {
      jobId: job.id,
      status: 'pending',
      configHash: job.configHash,
    };
  }

  private computeConfigHash(config: Record<string, unknown>): string {
    return createHash('sha256').update(JSON.stringify(config)).digest('hex');
  }
}
