import { ApiProperty } from '@nestjs/swagger';

class InPlayBacktestSymbolSummaryDto {
  @ApiProperty()
  readonly symbol: string;

  @ApiProperty()
  readonly windows: number;

  @ApiProperty()
  readonly mergedWindows: number;

  @ApiProperty()
  readonly processedCandles: number;

  @ApiProperty()
  readonly generatedSignals: number;

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

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  readonly diagnostics: Record<string, number>;
}

export class RunInPlayBacktestResponseDto {
  @ApiProperty()
  readonly runId: string;

  @ApiProperty()
  readonly status: 'completed';

  @ApiProperty()
  readonly symbolsProcessed: number;

  @ApiProperty()
  readonly windows: number;

  @ApiProperty()
  readonly mergedWindows: number;

  @ApiProperty()
  readonly processedCandles: number;

  @ApiProperty()
  readonly generatedSignals: number;

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

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  readonly diagnostics: Record<string, number>;

  @ApiProperty({ type: [InPlayBacktestSymbolSummaryDto] })
  readonly perSymbol: InPlayBacktestSymbolSummaryDto[];
}
