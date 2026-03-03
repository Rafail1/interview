import { Inject, Injectable } from '@nestjs/common';
import {
  CANDLE_INGESTION_JOB_REPOSITORY_TOKEN,
  type CandleIngestionSymbolRunView,
  type ICandleIngestionJobRepository,
} from 'src/backtesting/domain/interfaces/candle-ingestion-job-repository.interface';

@Injectable()
export class GetCandleIngestionJobSymbolRunsUseCase {
  constructor(
    @Inject(CANDLE_INGESTION_JOB_REPOSITORY_TOKEN)
    private readonly repository: ICandleIngestionJobRepository,
  ) { }

  public async execute(jobId: string): Promise<CandleIngestionSymbolRunView[] | null> {
    return this.repository.findSymbolRunsByJobId(jobId);
  }
}
