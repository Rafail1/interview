import { Inject, Injectable } from '@nestjs/common';
import {
  CANDLE_INGESTION_RUNNER_TOKEN,
  type ICandleIngestionRunner,
} from 'src/backtesting/domain/interfaces/candle-ingestion-runner.interface';
import { StartCandleIngestionRunnerResponseDto } from 'src/backtesting/interfaces/dtos/start-candle-ingestion-runner-response.dto';

@Injectable()
export class StartCandleIngestionRunnerUseCase {
  constructor(
    @Inject(CANDLE_INGESTION_RUNNER_TOKEN)
    private readonly runner: ICandleIngestionRunner,
  ) {}

  public async execute(): Promise<StartCandleIngestionRunnerResponseDto> {
    const resumedJobs = await this.runner.resumePendingJobs();
    return { resumedJobs };
  }
}
