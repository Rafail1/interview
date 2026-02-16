import { ApiProperty } from '@nestjs/swagger';

class BacktestTradeResponseDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty()
  readonly entryTime: string;

  @ApiProperty({ nullable: true })
  readonly exitTime: string | null;

  @ApiProperty()
  readonly entryPrice: string;

  @ApiProperty({ nullable: true })
  readonly exitPrice: string | null;

  @ApiProperty()
  readonly quantity: string;

  @ApiProperty()
  readonly side: string;

  @ApiProperty()
  readonly pnl: string;

  @ApiProperty()
  readonly pnlPercent: number;

  @ApiProperty()
  readonly status: string;

  @ApiProperty()
  readonly createdAt: Date;
}

export class BacktestRunResponseDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty()
  readonly symbol: string;

  @ApiProperty()
  readonly interval: string;

  @ApiProperty()
  readonly strategyVersion: string;

  @ApiProperty({ type: Object })
  readonly config: Record<string, unknown>;

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
  readonly avgWin: string;

  @ApiProperty()
  readonly avgLoss: string;

  @ApiProperty()
  readonly signalsCount: number;

  @ApiProperty()
  readonly equityPointsCount: number;

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty({ type: [BacktestTradeResponseDto] })
  readonly trades: BacktestTradeResponseDto[];
}
