import { ApiProperty } from '@nestjs/swagger';
import { RealtimeActiveSymbolDto } from './realtime-active-symbol.dto';

export class ListActiveMarketSymbolsResponseDto {
  @ApiProperty({ type: [RealtimeActiveSymbolDto] })
  readonly items: RealtimeActiveSymbolDto[];
}
