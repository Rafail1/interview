import { Inject, Injectable } from '@nestjs/common';
import {
  type IRealtimeMarketActivityTracker,
  REALTIME_MARKET_ACTIVITY_TRACKER_TOKEN,
} from 'src/realtime-signals/domain/interfaces/realtime-market-activity-tracker.interface';
import { MarketActivityTrackerStatusResponseDto } from 'src/realtime-signals/interfaces/dtos/market-activity-tracker-status-response.dto';

@Injectable()
export class GetMarketActivityTrackerStatusUseCase {
  constructor(
    @Inject(REALTIME_MARKET_ACTIVITY_TRACKER_TOKEN)
    private readonly tracker: IRealtimeMarketActivityTracker,
  ) {}

  public execute(): MarketActivityTrackerStatusResponseDto {
    return this.tracker.getStatus();
  }
}
