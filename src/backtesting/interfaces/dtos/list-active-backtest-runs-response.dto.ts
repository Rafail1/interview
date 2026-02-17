import { ApiProperty } from '@nestjs/swagger';

class ActiveBacktestRunDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty()
  readonly symbol: string;

  @ApiProperty()
  readonly interval: string;

  @ApiProperty()
  readonly strategyVersion: string;

  @ApiProperty({ enum: ['pending', 'running'] })
  readonly status: 'pending' | 'running';

  @ApiProperty()
  readonly processedCandles: number;

  @ApiProperty()
  readonly generatedSignals: number;

  @ApiProperty()
  readonly startTime: string;

  @ApiProperty()
  readonly endTime: string;

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty()
  readonly updatedAt: Date;

  @ApiProperty({ nullable: true })
  readonly cancelRequestedAt: Date | null;
}

export class ListActiveBacktestRunsResponseDto {
  @ApiProperty({ type: [ActiveBacktestRunDto] })
  readonly items: ActiveBacktestRunDto[];
}
