import { Inject, Injectable } from '@nestjs/common';
import {
  IN_PLAY_RUN_REPOSITORY_TOKEN,
  type IInPlayRunRepository,
} from 'src/backtesting/domain/interfaces/in-play-run-repository.interface';
import { ListInPlayRunsQueryDto } from 'src/backtesting/interfaces/dtos/list-in-play-runs-query.dto';
import { ListInPlayRunsResponseDto } from 'src/backtesting/interfaces/dtos/list-in-play-runs-response.dto';

@Injectable()
export class ListInPlayRunsUseCase {
  constructor(
    @Inject(IN_PLAY_RUN_REPOSITORY_TOKEN)
    private readonly repository: IInPlayRunRepository,
  ) {}

  public async execute(
    query: ListInPlayRunsQueryDto,
  ): Promise<ListInPlayRunsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    return this.repository.listRuns({
      status: query.status,
      page,
      limit,
    });
  }
}
