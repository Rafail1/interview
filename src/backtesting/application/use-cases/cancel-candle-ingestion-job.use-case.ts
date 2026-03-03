import { Inject, Injectable } from '@nestjs/common';
import {
  CANDLE_INGESTION_JOB_REPOSITORY_TOKEN,
  type ICandleIngestionJobRepository,
} from 'src/backtesting/domain/interfaces/candle-ingestion-job-repository.interface';
import { CancelCandleIngestionJobResponseDto } from 'src/backtesting/interfaces/dtos/cancel-candle-ingestion-job-response.dto';

@Injectable()
export class CancelCandleIngestionJobUseCase {
  constructor(
    @Inject(CANDLE_INGESTION_JOB_REPOSITORY_TOKEN)
    private readonly repository: ICandleIngestionJobRepository,
  ) {}

  public async execute(
    jobId: string,
  ): Promise<CancelCandleIngestionJobResponseDto | null> {
    const existsOrUpdated = await this.repository.requestCancel(jobId);
    if (!existsOrUpdated) {
      return null;
    }

    const job = await this.repository.findById(jobId);
    if (!job) {
      return null;
    }

    return {
      jobId,
      status: job.status,
    };
  }
}
