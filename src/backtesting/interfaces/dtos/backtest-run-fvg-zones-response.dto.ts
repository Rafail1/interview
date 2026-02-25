import { ApiProperty } from '@nestjs/swagger';

class BacktestRunFvgZoneDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty({ enum: ['bullish', 'bearish'] })
  readonly direction: 'bullish' | 'bearish';

  @ApiProperty()
  readonly lowerBound: string;

  @ApiProperty()
  readonly upperBound: string;

  @ApiProperty({
    description: '3rd candle open time when this FVG was formed',
  })
  readonly startTime: string;

  @ApiProperty({
    nullable: true,
    description: 'Time when zone became mitigated (price touched the zone)',
  })
  readonly endTime: string | null;

  @ApiProperty()
  readonly description: string;
}

export class BacktestRunFvgZonesResponseDto {
  @ApiProperty({ type: [BacktestRunFvgZoneDto] })
  readonly items: BacktestRunFvgZoneDto[];

  @ApiProperty()
  readonly total: number;
}
