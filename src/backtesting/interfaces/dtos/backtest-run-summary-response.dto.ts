import { ApiProperty } from '@nestjs/swagger';

export class BacktestRunSummaryResponseDto {
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
  readonly winningTrades: number;

  @ApiProperty()
  readonly losingTrades: number;

  @ApiProperty()
  readonly winRate: number;

  @ApiProperty()
  readonly totalPnL: string;

  @ApiProperty()
  readonly maxDrawdown: string;

  @ApiProperty()
  readonly sharpeRatio: number;

  @ApiProperty()
  readonly profitFactor: number;

  @ApiProperty()
  readonly signalsCount: number;

  @ApiProperty()
  readonly equityPointsCount: number;

  @ApiProperty({ nullable: true })
  readonly lastEquity: string | null;

  @ApiProperty({ nullable: true })
  readonly lastDrawdown: string | null;

  @ApiProperty()
  readonly createdAt: Date;
}
