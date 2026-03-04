import { ApiProperty } from '@nestjs/swagger';

class InPlayEntryWindowDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty()
  readonly runId: string;

  @ApiProperty()
  readonly rangeId: string;

  @ApiProperty()
  readonly symbol: string;

  @ApiProperty()
  readonly interval: string;

  @ApiProperty()
  readonly zoneId: string;

  @ApiProperty({ enum: ['bullish', 'bearish'] })
  readonly zoneDirection: 'bullish' | 'bearish';

  @ApiProperty()
  readonly zoneLowerBound: string;

  @ApiProperty()
  readonly zoneUpperBound: string;

  @ApiProperty()
  readonly zoneStartTime: string;

  @ApiProperty()
  readonly mitigatedCandleOpenTime: string;

  @ApiProperty()
  readonly mitigatedCandleCloseTime: string;

  @ApiProperty()
  readonly outsideCandleCloseTime: string;

  @ApiProperty()
  readonly fromTime: string;

  @ApiProperty()
  readonly toTime: string;

  @ApiProperty()
  readonly description: string;

  @ApiProperty()
  readonly createdAt: Date;
}

export class ListInPlayEntryWindowsResponseDto {
  @ApiProperty()
  readonly runId: string;

  @ApiProperty({ type: [InPlayEntryWindowDto] })
  readonly items: InPlayEntryWindowDto[];
}
