import { ApiProperty } from '@nestjs/swagger';

class InPlayFvgZoneDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty()
  readonly rangeId: string;

  @ApiProperty()
  readonly symbol: string;

  @ApiProperty()
  readonly interval: string;

  @ApiProperty({ enum: ['bullish', 'bearish'] })
  readonly direction: 'bullish' | 'bearish';

  @ApiProperty()
  readonly startTime: string;

  @ApiProperty()
  readonly endTime: string;

  @ApiProperty()
  readonly lowerBound: string;

  @ApiProperty()
  readonly upperBound: string;

  @ApiProperty()
  readonly mitigated: boolean;

  @ApiProperty({ nullable: true })
  readonly mitigatedTime: string | null;

  @ApiProperty({ nullable: true })
  readonly mitigatedPrice: string | null;

  @ApiProperty({ nullable: true })
  readonly mitigatedCandleOpenTime: string | null;

  @ApiProperty({ nullable: true })
  readonly mitigatedCandleCloseTime: string | null;

  @ApiProperty({ enum: ['both', 'volume_only', 'volatility_only'] })
  readonly activationReason: 'both' | 'volume_only' | 'volatility_only';

  @ApiProperty()
  readonly description: string;
}

export class ListInPlayFvgZonesResponseDto {
  @ApiProperty()
  readonly runId: string;

  @ApiProperty({ type: [InPlayFvgZoneDto] })
  readonly items: InPlayFvgZoneDto[];
}
