import { ApiProperty } from '@nestjs/swagger';

class BacktestMetricsDto {
  @ApiProperty()
  readonly totalTrades: number;

  @ApiProperty()
  readonly winningTrades: number;

  @ApiProperty()
  readonly losingTrades: number;

  @ApiProperty()
  readonly drawTrades: number;

  @ApiProperty()
  readonly winRate: string;

  @ApiProperty()
  readonly totalPnL: string;

  @ApiProperty()
  readonly roi: string;

  @ApiProperty()
  readonly avgWin: string;

  @ApiProperty()
  readonly avgLoss: string;

  @ApiProperty()
  readonly profitFactor: string;

  @ApiProperty()
  readonly maxDrawdown: string;

  @ApiProperty()
  readonly drawdownPercent: string;

  @ApiProperty()
  readonly expectancy: string;

  @ApiProperty()
  readonly sharpeRatio: string;
}

export class RunBacktestResponseDto {
  @ApiProperty()
  readonly symbol: string;

  @ApiProperty()
  readonly fromInterval: string;

  @ApiProperty()
  readonly toInterval: string;

  @ApiProperty()
  readonly processedCandles: number;

  @ApiProperty()
  readonly generatedSignals: number;

  @ApiProperty({ type: BacktestMetricsDto })
  readonly metrics: BacktestMetricsDto;
}
