import { Inject, Injectable } from '@nestjs/common';
import {
  BACKTEST_RUN_REPOSITORY_TOKEN,
  type IBacktestRunRepository,
} from 'src/backtesting/domain/interfaces/backtest-run-repository.interface';

@Injectable()
export class GetBacktestRunEquityUseCase {
  constructor(
    @Inject(BACKTEST_RUN_REPOSITORY_TOKEN)
    private readonly backtestRunRepository: IBacktestRunRepository,
  ) {}

  public async execute(runId: string) {
    return this.backtestRunRepository.findEquityByRunId(runId);
  }
}
