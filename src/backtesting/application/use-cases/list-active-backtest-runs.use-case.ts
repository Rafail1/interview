import { Inject, Injectable } from '@nestjs/common';
import {
  BACKTEST_RUN_REPOSITORY_TOKEN,
  type IBacktestRunRepository,
} from 'src/backtesting/domain/interfaces/backtest-run-repository.interface';
import { ListActiveBacktestRunsResponseDto } from 'src/backtesting/interfaces/dtos/list-active-backtest-runs-response.dto';

@Injectable()
export class ListActiveBacktestRunsUseCase {
  constructor(
    @Inject(BACKTEST_RUN_REPOSITORY_TOKEN)
    private readonly backtestRunRepository: IBacktestRunRepository,
  ) {}

  public async execute(): Promise<ListActiveBacktestRunsResponseDto> {
    const items = await this.backtestRunRepository.listActiveRuns();
    return { items };
  }
}
