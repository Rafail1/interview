import { ApiProperty } from '@nestjs/swagger';

export class CandleIngestionSymbolRunDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty()
  readonly jobId: string;

  @ApiProperty()
  readonly symbol: string;

  @ApiProperty()
  readonly interval: string;

  @ApiProperty({
    enum: ['pending', 'running', 'completed', 'failed', 'skipped'],
  })
  readonly status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

  @ApiProperty({ nullable: true })
  readonly errorMessage: string | null;

  @ApiProperty({ nullable: true })
  readonly fromOpenTime: string | null;

  @ApiProperty({ nullable: true })
  readonly toOpenTime: string | null;

  @ApiProperty({ nullable: true })
  readonly lastSyncedOpenTime: string | null;

  @ApiProperty()
  readonly processedCandles: number;

  @ApiProperty()
  readonly insertedCandles: number;

  @ApiProperty()
  readonly updatedCandles: number;

  @ApiProperty()
  readonly retries: number;

  @ApiProperty({ nullable: true })
  readonly startedAt: Date | null;

  @ApiProperty({ nullable: true })
  readonly completedAt: Date | null;

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty()
  readonly updatedAt: Date;
}

export class CandleIngestionJobSymbolRunsResponseDto {
  @ApiProperty()
  readonly jobId: string;

  @ApiProperty({ type: [CandleIngestionSymbolRunDto] })
  readonly runs: CandleIngestionSymbolRunDto[];
}
