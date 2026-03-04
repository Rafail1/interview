import { Inject, Injectable } from '@nestjs/common';
import {
  IN_PLAY_RUN_REPOSITORY_TOKEN,
  type IInPlayRunRepository,
} from 'src/backtesting/domain/interfaces/in-play-run-repository.interface';
import { InPlayRunStatusResponseDto } from 'src/backtesting/interfaces/dtos/in-play-run-status-response.dto';

@Injectable()
export class GetInPlayRunStatusUseCase {
  constructor(
    @Inject(IN_PLAY_RUN_REPOSITORY_TOKEN)
    private readonly repository: IInPlayRunRepository,
  ) {}

  public async execute(runId: string): Promise<InPlayRunStatusResponseDto | null> {
    return this.repository.findRunById(runId);
  }
}
