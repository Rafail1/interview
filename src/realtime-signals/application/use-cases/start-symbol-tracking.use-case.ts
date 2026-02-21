import { Inject, Injectable } from '@nestjs/common';
import {
  IRealtimeSymbolTracker,
  REALTIME_SYMBOL_TRACKER_TOKEN,
} from 'src/realtime-signals/domain/interfaces/realtime-symbol-tracker.interface';
import { StartSymbolTrackingRequestDto } from 'src/realtime-signals/interfaces/dtos/start-symbol-tracking-request.dto';
import { StartSymbolTrackingResponseDto } from 'src/realtime-signals/interfaces/dtos/start-symbol-tracking-response.dto';

@Injectable()
export class StartSymbolTrackingUseCase {
  constructor(
    @Inject(REALTIME_SYMBOL_TRACKER_TOKEN)
    private readonly tracker: IRealtimeSymbolTracker,
  ) {}

  public async execute(
    command: StartSymbolTrackingRequestDto,
  ): Promise<StartSymbolTrackingResponseDto> {
    return this.tracker.startTracking(command.symbols);
  }
}

