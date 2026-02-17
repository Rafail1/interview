import { Inject, Injectable } from '@nestjs/common';
import {
  BACKTEST_RUN_REPOSITORY_TOKEN,
  type IBacktestRunRepository,
} from 'src/backtesting/domain/interfaces/backtest-run-repository.interface';
import { CancelBacktestRunResponseDto } from 'src/backtesting/interfaces/dtos/cancel-backtest-run-response.dto';

@Injectable()
export class CancelBacktestRunUseCase {
  constructor(
    @Inject(BACKTEST_RUN_REPOSITORY_TOKEN)
    private readonly backtestRunRepository: IBacktestRunRepository,
  ) {}

  public async execute(
    runId: string,
  ): Promise<CancelBacktestRunResponseDto | null> {
    const existsOrUpdated = await this.backtestRunRepository.cancelRun(runId);
    if (!existsOrUpdated) {
      return null;
    }

    const run = await this.backtestRunRepository.findById(runId);
    if (!run) {
      return null;
    }

    return {
      runId,
      status: run.status,
    };
  }
}
