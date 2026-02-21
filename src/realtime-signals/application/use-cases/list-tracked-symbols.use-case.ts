import { Inject, Injectable } from '@nestjs/common';
import {
  type IRealtimeSymbolTracker,
  REALTIME_SYMBOL_TRACKER_TOKEN,
} from 'src/realtime-signals/domain/interfaces/realtime-symbol-tracker.interface';
import { ListTrackedSymbolsResponseDto } from 'src/realtime-signals/interfaces/dtos/list-tracked-symbols-response.dto';

@Injectable()
export class ListTrackedSymbolsUseCase {
  constructor(
    @Inject(REALTIME_SYMBOL_TRACKER_TOKEN)
    private readonly tracker: IRealtimeSymbolTracker,
  ) {}

  public execute(): ListTrackedSymbolsResponseDto {
    return {
      tracked: this.tracker.getTrackedSymbols(),
    };
  }
}
