import { Inject, Injectable } from '@nestjs/common';
import {
  type IRealtimeMarketActivityTracker,
  REALTIME_MARKET_ACTIVITY_TRACKER_TOKEN,
} from 'src/realtime-signals/domain/interfaces/realtime-market-activity-tracker.interface';
import { StartMarketActivityTrackerResponseDto } from 'src/realtime-signals/interfaces/dtos/start-market-activity-tracker-response.dto';

@Injectable()
export class StartMarketActivityTrackerUseCase {
  constructor(
    @Inject(REALTIME_MARKET_ACTIVITY_TRACKER_TOKEN)
    private readonly tracker: IRealtimeMarketActivityTracker,
  ) {}

  public async execute(): Promise<StartMarketActivityTrackerResponseDto> {
    return this.tracker.start();
  }
}
