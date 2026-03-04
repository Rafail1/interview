import { Inject, Injectable } from '@nestjs/common';
import {
  IN_PLAY_RUN_REPOSITORY_TOKEN,
  type IInPlayRunRepository,
} from 'src/backtesting/domain/interfaces/in-play-run-repository.interface';
import { ListInPlayEntryWindowsQueryDto } from 'src/backtesting/interfaces/dtos/list-in-play-entry-windows-query.dto';
import { ListInPlayEntryWindowsResponseDto } from 'src/backtesting/interfaces/dtos/list-in-play-entry-windows-response.dto';

@Injectable()
export class ListInPlayEntryWindowsUseCase {
  constructor(
    @Inject(IN_PLAY_RUN_REPOSITORY_TOKEN)
    private readonly repository: IInPlayRunRepository,
  ) {}

  public async execute(
    runId: string,
    query: ListInPlayEntryWindowsQueryDto,
  ): Promise<ListInPlayEntryWindowsResponseDto | null> {
    const symbol = query.symbol?.toUpperCase();
    const items = await this.repository.listEntryWindows(runId, symbol);
    if (!items) {
      return null;
    }
    return {
      runId,
      items,
    };
  }
}
