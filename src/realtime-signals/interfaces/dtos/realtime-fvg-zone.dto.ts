import { ApiProperty } from '@nestjs/swagger';

export class RealtimeFvgZoneDto {
  @ApiProperty()
  readonly symbol: string;

  @ApiProperty()
  readonly id: string;

  @ApiProperty({ enum: ['bullish', 'bearish'] })
  readonly direction: 'bullish' | 'bearish';

  @ApiProperty()
  readonly upperBound: string;

  @ApiProperty()
  readonly lowerBound: string;

  @ApiProperty()
  readonly startTime: string;

  @ApiProperty({ nullable: true })
  readonly endTime: string | null;

  @ApiProperty()
  readonly mitigated: boolean;
}
