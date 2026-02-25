import { ApiProperty } from '@nestjs/swagger';
import { RealtimeFvgZoneDto } from './realtime-fvg-zone.dto';

export class ListFvgZonesResponseDto {
  @ApiProperty({ type: [RealtimeFvgZoneDto] })
  readonly items: RealtimeFvgZoneDto[];
}
