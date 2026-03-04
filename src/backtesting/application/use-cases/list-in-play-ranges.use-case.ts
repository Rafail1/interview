import { Inject, Injectable } from '@nestjs/common';
import {
  IN_PLAY_RUN_REPOSITORY_TOKEN,
  type IInPlayRunRepository,
} from 'src/backtesting/domain/interfaces/in-play-run-repository.interface';
import { ListInPlayRangesQueryDto } from 'src/backtesting/interfaces/dtos/list-in-play-ranges-query.dto';
import { ListInPlayRangesResponseDto } from 'src/backtesting/interfaces/dtos/list-in-play-ranges-response.dto';

@Injectable()
export class ListInPlayRangesUseCase {
  constructor(
    @Inject(IN_PLAY_RUN_REPOSITORY_TOKEN)
    private readonly repository: IInPlayRunRepository,
  ) {}

  public async execute(
    runId: string,
    query: ListInPlayRangesQueryDto,
  ): Promise<ListInPlayRangesResponseDto | null> {
    const symbol = query.symbol?.toUpperCase();
    const items = await this.repository.listRanges(runId, symbol);
    if (!items) {
      return null;
    }
    return {
      runId,
      items,
    };
  }
}
