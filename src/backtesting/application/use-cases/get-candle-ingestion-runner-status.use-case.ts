import { Inject, Injectable } from '@nestjs/common';
import {
  CANDLE_INGESTION_RUNNER_TOKEN,
  type ICandleIngestionRunner,
} from 'src/backtesting/domain/interfaces/candle-ingestion-runner.interface';
import { CandleIngestionRunnerStatusResponseDto } from 'src/backtesting/interfaces/dtos/candle-ingestion-runner-status-response.dto';

@Injectable()
export class GetCandleIngestionRunnerStatusUseCase {
  constructor(
    @Inject(CANDLE_INGESTION_RUNNER_TOKEN)
    private readonly runner: ICandleIngestionRunner,
  ) {}

  public execute(): CandleIngestionRunnerStatusResponseDto {
    return this.runner.getStatus();
  }
}
