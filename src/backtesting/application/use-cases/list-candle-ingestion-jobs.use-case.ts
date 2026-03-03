import { Inject, Injectable } from '@nestjs/common';
import {
  CANDLE_INGESTION_JOB_REPOSITORY_TOKEN,
  type ICandleIngestionJobRepository,
} from 'src/backtesting/domain/interfaces/candle-ingestion-job-repository.interface';
import { ListCandleIngestionJobsQueryDto } from 'src/backtesting/interfaces/dtos/list-candle-ingestion-jobs-query.dto';

@Injectable()
export class ListCandleIngestionJobsUseCase {
  constructor(
    @Inject(CANDLE_INGESTION_JOB_REPOSITORY_TOKEN)
    private readonly repository: ICandleIngestionJobRepository,
  ) {}

  public async execute(query: ListCandleIngestionJobsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';
    const fromDate = query.fromDate ? new Date(query.fromDate) : undefined;
    const toDate = query.toDate ? new Date(query.toDate) : undefined;

    if (fromDate && toDate && fromDate > toDate) {
      throw new Error('fromDate must be before or equal to toDate');
    }

    return this.repository.listJobs({
      sortBy,
      sortOrder,
      status: query.status,
      mode: query.mode,
      interval: query.interval,
      fromDate,
      toDate,
      page,
      limit,
    });
  }
}
