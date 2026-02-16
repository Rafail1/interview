import { ApiProperty } from '@nestjs/swagger';

class BacktestSignalEventDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty()
  readonly timestamp: string;

  @ApiProperty({ enum: ['BUY', 'SELL', 'INVALID'] })
  readonly signalType: 'BUY' | 'SELL' | 'INVALID';

  @ApiProperty()
  readonly reason: string;

  @ApiProperty()
  readonly price: string;

  @ApiProperty({ type: Object, nullable: true })
  readonly metadata: Record<string, unknown> | null;

  @ApiProperty()
  readonly createdAt: Date;
}

export class BacktestRunSignalsResponseDto {
  @ApiProperty({ type: [BacktestSignalEventDto] })
  readonly items: BacktestSignalEventDto[];
}
