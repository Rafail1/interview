import { Inject, Injectable } from '@nestjs/common';
import {
  type IRealtimeSymbolTracker,
  REALTIME_SYMBOL_TRACKER_TOKEN,
} from 'src/realtime-signals/domain/interfaces/realtime-symbol-tracker.interface';
import { StopSymbolTrackingRequestDto } from 'src/realtime-signals/interfaces/dtos/stop-symbol-tracking-request.dto';
import { StopSymbolTrackingResponseDto } from 'src/realtime-signals/interfaces/dtos/stop-symbol-tracking-response.dto';

@Injectable()
export class StopSymbolTrackingUseCase {
  constructor(
    @Inject(REALTIME_SYMBOL_TRACKER_TOKEN)
    private readonly tracker: IRealtimeSymbolTracker,
  ) {}

  public execute(
    command: StopSymbolTrackingRequestDto,
  ): StopSymbolTrackingResponseDto {
    return this.tracker.stopTracking(command.symbol);
  }
}
