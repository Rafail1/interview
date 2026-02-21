import { ApiProperty } from '@nestjs/swagger';
import { RealtimeTrackedSymbolDto } from './realtime-tracked-symbol.dto';

export class ListTrackedSymbolsResponseDto {
  @ApiProperty({ type: [RealtimeTrackedSymbolDto] })
  readonly tracked: RealtimeTrackedSymbolDto[];
}

