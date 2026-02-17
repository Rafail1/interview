import { Inject, Injectable } from '@nestjs/common';
import {
  BACKTEST_RUN_REPOSITORY_TOKEN,
  type IBacktestRunRepository,
} from 'src/backtesting/domain/interfaces/backtest-run-repository.interface';
import { BacktestRunProgressResponseDto } from 'src/backtesting/interfaces/dtos/backtest-run-progress-response.dto';

@Injectable()
export class GetBacktestRunProgressUseCase {
  constructor(
    @Inject(BACKTEST_RUN_REPOSITORY_TOKEN)
    private readonly backtestRunRepository: IBacktestRunRepository,
  ) {}

  public async execute(
    runId: string,
  ): Promise<BacktestRunProgressResponseDto | null> {
    const run = await this.backtestRunRepository.findById(runId);
    if (!run) {
      return null;
    }

    return {
      runId: run.id,
      status: run.status,
      errorMessage: run.errorMessage,
      processedCandles: run.processedCandles,
      generatedSignals: run.generatedSignals,
      startTime: run.startTime,
      endTime: run.endTime,
      cancelRequestedAt: run.cancelRequestedAt,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
    };
  }
}
