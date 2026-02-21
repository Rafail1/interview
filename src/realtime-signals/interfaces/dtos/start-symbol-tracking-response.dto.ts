import { ApiProperty } from '@nestjs/swagger';
import { RealtimeTrackedSymbolDto } from './realtime-tracked-symbol.dto';

export class StartSymbolTrackingResponseDto {
  @ApiProperty({ type: [String], example: ['BTCUSDT'] })
  readonly started: string[];

  @ApiProperty({ type: [String], example: ['ETHUSDT'] })
  readonly alreadyTracking: string[];

  @ApiProperty({ type: [RealtimeTrackedSymbolDto] })
  readonly tracked: RealtimeTrackedSymbolDto[];
}

