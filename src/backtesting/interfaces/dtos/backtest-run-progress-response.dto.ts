import { ApiProperty } from '@nestjs/swagger';

export class BacktestRunProgressResponseDto {
  @ApiProperty()
  readonly runId: string;

  @ApiProperty({
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
  })
  readonly status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

  @ApiProperty({ nullable: true })
  readonly errorMessage: string | null;

  @ApiProperty()
  readonly processedCandles: number;

  @ApiProperty()
  readonly generatedSignals: number;

  @ApiProperty()
  readonly startTime: string;

  @ApiProperty()
  readonly endTime: string;

  @ApiProperty({ nullable: true })
  readonly cancelRequestedAt: Date | null;

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty()
  readonly updatedAt: Date;
}
