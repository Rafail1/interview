import { Inject, Injectable } from '@nestjs/common';
import {
  CANDLE_INGESTION_JOB_REPOSITORY_TOKEN,
  type CandleIngestionJobDetailsView,
  type ICandleIngestionJobRepository,
} from 'src/backtesting/domain/interfaces/candle-ingestion-job-repository.interface';

@Injectable()
export class GetCandleIngestionJobDetailsUseCase {
  constructor(
    @Inject(CANDLE_INGESTION_JOB_REPOSITORY_TOKEN)
    private readonly repository: ICandleIngestionJobRepository,
  ) {}

  public async execute(jobId: string): Promise<CandleIngestionJobDetailsView | null> {
    return this.repository.findDetailsById(jobId);
  }
}
