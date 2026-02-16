import { Inject, Injectable } from '@nestjs/common';
import {
  BACKTEST_RUN_REPOSITORY_TOKEN,
  type BacktestSignalEventListView,
  type IBacktestRunRepository,
} from 'src/backtesting/domain/interfaces/backtest-run-repository.interface';
import { BacktestRunSeriesQueryDto } from 'src/backtesting/interfaces/dtos/backtest-run-series-query.dto';

@Injectable()
export class GetBacktestRunSignalsUseCase {
  constructor(
    @Inject(BACKTEST_RUN_REPOSITORY_TOKEN)
    private readonly backtestRunRepository: IBacktestRunRepository,
  ) {}

  public async execute(
    runId: string,
    query: BacktestRunSeriesQueryDto,
  ): Promise<BacktestSignalEventListView | null> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 100;
    const fromTs = query.fromTs ? BigInt(query.fromTs) : undefined;
    const toTs = query.toTs ? BigInt(query.toTs) : undefined;

    if (fromTs !== undefined && toTs !== undefined && fromTs > toTs) {
      throw new Error('fromTs must be before or equal to toTs');
    }

    return this.backtestRunRepository.findSignalsByRunId({
      runId,
      page,
      limit,
      fromTs,
      toTs,
    });
  }
}
