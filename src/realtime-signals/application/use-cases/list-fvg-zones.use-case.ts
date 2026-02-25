import { Inject, Injectable } from '@nestjs/common';
import {
  type IRealtimeSymbolTracker,
  REALTIME_SYMBOL_TRACKER_TOKEN,
} from 'src/realtime-signals/domain/interfaces/realtime-symbol-tracker.interface';
import { ListFvgZonesQueryDto } from 'src/realtime-signals/interfaces/dtos/list-fvg-zones-query.dto';
import { ListFvgZonesResponseDto } from 'src/realtime-signals/interfaces/dtos/list-fvg-zones-response.dto';

@Injectable()
export class ListFvgZonesUseCase {
  constructor(
    @Inject(REALTIME_SYMBOL_TRACKER_TOKEN)
    private readonly tracker: IRealtimeSymbolTracker,
  ) {}

  public execute(query: ListFvgZonesQueryDto): ListFvgZonesResponseDto {
    return {
      items: this.tracker.listFvgZones(query.symbol),
    };
  }
}
