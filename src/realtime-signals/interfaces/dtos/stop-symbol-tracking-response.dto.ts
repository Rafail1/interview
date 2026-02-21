import { ApiProperty } from '@nestjs/swagger';
import { RealtimeTrackedSymbolDto } from './realtime-tracked-symbol.dto';

export class StopSymbolTrackingResponseDto {
  @ApiProperty({ example: 'BTCUSDT' })
  readonly symbol: string;

  @ApiProperty({ example: true })
  readonly stopped: boolean;

  @ApiProperty({ type: [RealtimeTrackedSymbolDto] })
  readonly tracked: RealtimeTrackedSymbolDto[];
}

