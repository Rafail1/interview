import { ApiProperty } from '@nestjs/swagger';

class InPlayRangeDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty()
  readonly runId: string;

  @ApiProperty()
  readonly symbol: string;

  @ApiProperty()
  readonly interval: string;

  @ApiProperty()
  readonly startTime: string;

  @ApiProperty()
  readonly endTime: string;

  @ApiProperty()
  readonly lowPrice: string;

  @ApiProperty()
  readonly highPrice: string;

  @ApiProperty()
  readonly activeWindows: number;

  @ApiProperty()
  readonly avgQuoteVolume: string;

  @ApiProperty()
  readonly maxVolatilityPercent: string;

  @ApiProperty()
  readonly createdAt: Date;
}

export class ListInPlayRangesResponseDto {
  @ApiProperty()
  readonly runId: string;

  @ApiProperty({ type: [InPlayRangeDto] })
  readonly items: InPlayRangeDto[];
}
