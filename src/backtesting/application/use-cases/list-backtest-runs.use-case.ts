import { Inject, Injectable } from '@nestjs/common';
import {
  BACKTEST_RUN_REPOSITORY_TOKEN,
  type IBacktestRunRepository,
} from 'src/backtesting/domain/interfaces/backtest-run-repository.interface';
import { ListBacktestRunsQueryDto } from 'src/backtesting/interfaces/dtos/list-backtest-runs-query.dto';

@Injectable()
export class ListBacktestRunsUseCase {
  constructor(
    @Inject(BACKTEST_RUN_REPOSITORY_TOKEN)
    private readonly backtestRunRepository: IBacktestRunRepository,
  ) {}

  public async execute(query: ListBacktestRunsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';
    const fromDate = query.fromDate ? new Date(query.fromDate) : undefined;
    const toDate = query.toDate ? new Date(query.toDate) : undefined;

    if (fromDate && toDate && fromDate > toDate) {
      throw new Error('fromDate must be before or equal to toDate');
    }

    return this.backtestRunRepository.listRuns({
      sortBy,
      sortOrder,
      symbol: query.symbol,
      interval: query.interval,
      fromDate,
      toDate,
      page,
      limit,
    });
  }
}
