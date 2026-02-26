import { Inject, Injectable } from '@nestjs/common';
import {
  type IRealtimeMarketActivityTracker,
  REALTIME_MARKET_ACTIVITY_TRACKER_TOKEN,
} from 'src/realtime-signals/domain/interfaces/realtime-market-activity-tracker.interface';
import { ListActiveMarketSymbolsResponseDto } from 'src/realtime-signals/interfaces/dtos/list-active-market-symbols-response.dto';

@Injectable()
export class ListActiveMarketSymbolsUseCase {
  constructor(
    @Inject(REALTIME_MARKET_ACTIVITY_TRACKER_TOKEN)
    private readonly activityTracker: IRealtimeMarketActivityTracker,
  ) {}

  public execute(): ListActiveMarketSymbolsResponseDto {
    return {
      items: this.activityTracker.getActiveSymbols(),
    };
  }
}
