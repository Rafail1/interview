import { ApiProperty } from '@nestjs/swagger';

class BacktestRunListItemDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty()
  readonly symbol: string;

  @ApiProperty()
  readonly interval: string;

  @ApiProperty()
  readonly strategyVersion: string;

  @ApiProperty({
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
  })
  readonly status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

  @ApiProperty({ nullable: true })
  readonly errorMessage: string | null;

  @ApiProperty()
  readonly startTime: string;

  @ApiProperty()
  readonly endTime: string;

  @ApiProperty()
  readonly totalTrades: number;

  @ApiProperty()
  readonly winRate: number;

  @ApiProperty()
  readonly totalPnL: string;

  @ApiProperty()
  readonly createdAt: Date;
}

export class ListBacktestRunsResponseDto {
  @ApiProperty({ type: [BacktestRunListItemDto] })
  readonly items: BacktestRunListItemDto[];

  @ApiProperty()
  readonly page: number;

  @ApiProperty()
  readonly limit: number;

  @ApiProperty()
  readonly total: number;
}
