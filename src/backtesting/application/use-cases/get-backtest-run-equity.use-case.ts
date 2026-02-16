import { Inject, Injectable } from '@nestjs/common';
import {
  BACKTEST_RUN_REPOSITORY_TOKEN,
  type BacktestEquityPointListView,
  type IBacktestRunRepository,
} from 'src/backtesting/domain/interfaces/backtest-run-repository.interface';
import { BacktestRunSeriesQueryDto } from 'src/backtesting/interfaces/dtos/backtest-run-series-query.dto';

@Injectable()
export class GetBacktestRunEquityUseCase {
  constructor(
    @Inject(BACKTEST_RUN_REPOSITORY_TOKEN)
    private readonly backtestRunRepository: IBacktestRunRepository,
  ) {}

  public async execute(
    runId: string,
    query: BacktestRunSeriesQueryDto,
  ): Promise<BacktestEquityPointListView | null> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 100;
    const fromTs = query.fromTs ? BigInt(query.fromTs) : undefined;
    const toTs = query.toTs ? BigInt(query.toTs) : undefined;

    if (fromTs !== undefined && toTs !== undefined && fromTs > toTs) {
      throw new Error('fromTs must be before or equal to toTs');
    }

    return this.backtestRunRepository.findEquityByRunId({
      runId,
      page,
      limit,
      fromTs,
      toTs,
    });
  }
}
