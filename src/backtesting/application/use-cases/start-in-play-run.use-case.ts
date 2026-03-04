import Decimal from 'decimal.js';
import { Inject, Injectable } from '@nestjs/common';
import {
  IN_PLAY_RUN_REPOSITORY_TOKEN,
  type IInPlayRunRepository,
} from 'src/backtesting/domain/interfaces/in-play-run-repository.interface';
import {
  IN_PLAY_RUNNER_TOKEN,
  type IInPlayRunner,
} from 'src/backtesting/domain/interfaces/in-play-runner.interface';
import { Timeframe } from 'src/backtesting/domain/value-objects/timeframe.value-object';
import { StartInPlayRunRequestDto } from 'src/backtesting/interfaces/dtos/start-in-play-run-request.dto';
import { StartInPlayRunResponseDto } from 'src/backtesting/interfaces/dtos/start-in-play-run-response.dto';

@Injectable()
export class StartInPlayRunUseCase {
  constructor(
    @Inject(IN_PLAY_RUN_REPOSITORY_TOKEN)
    private readonly repository: IInPlayRunRepository,
    @Inject(IN_PLAY_RUNNER_TOKEN)
    private readonly runner: IInPlayRunner,
  ) {}

  public async execute(
    request: StartInPlayRunRequestDto,
  ): Promise<StartInPlayRunResponseDto> {
    Timeframe.from(request.interval);
    const startTime = new Date(request.startDate).getTime();
    const endTime = new Date(request.endDate).getTime();
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
      throw new Error('Invalid date range');
    }
    if (startTime > endTime) {
      throw new Error('startDate must be before or equal to endDate');
    }

    const windowSize = request.windowSize ?? 24;
    const activationMode = request.activationMode ?? 'both';
    const quoteVolumeThreshold = request.quoteVolumeThreshold ?? '100000000';
    const volatilityThreshold = request.volatilityThreshold ?? '3';
    if (new Decimal(quoteVolumeThreshold).isNegative()) {
      throw new Error('quoteVolumeThreshold must be non-negative');
    }
    if (new Decimal(volatilityThreshold).isNegative()) {
      throw new Error('volatilityThreshold must be non-negative');
    }

    const symbols =
      request.symbols && request.symbols.length > 0
        ? request.symbols.map((symbol) => symbol.toUpperCase())
        : null;

    const run = await this.repository.createRun({
      interval: request.interval,
      startTime: BigInt(startTime),
      endTime: BigInt(endTime),
      symbols,
      activationMode,
      windowSize,
      quoteVolumeThreshold,
      volatilityThreshold,
    });

    this.runner.enqueue(run.id);
    return {
      runId: run.id,
      status: run.status,
    };
  }
}
