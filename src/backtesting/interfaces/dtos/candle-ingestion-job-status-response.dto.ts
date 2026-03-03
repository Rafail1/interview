import { ApiProperty } from '@nestjs/swagger';

export class CandleIngestionJobStatusResponseDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty({ enum: ['backfill', 'incremental'] })
  readonly mode: 'backfill' | 'incremental';

  @ApiProperty({
    enum: [
      'pending',
      'running',
      'completed',
      'failed',
      'cancelled',
      'completed_with_errors',
    ],
  })
  readonly status:
    | 'pending'
    | 'running'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'completed_with_errors';

  @ApiProperty({ nullable: true })
  readonly errorMessage: string | null;

  @ApiProperty()
  readonly interval: string;

  @ApiProperty()
  readonly backfillCandles: number;

  @ApiProperty()
  readonly symbolsTotal: number;

  @ApiProperty()
  readonly symbolsCompleted: number;

  @ApiProperty()
  readonly symbolsFailed: number;

  @ApiProperty()
  readonly symbolsSkipped: number;

  @ApiProperty()
  readonly configHash: string;

  @ApiProperty({ nullable: true })
  readonly freshnessTargetMs: string | null;

  @ApiProperty({ nullable: true })
  readonly startedAt: Date | null;

  @ApiProperty({ nullable: true })
  readonly completedAt: Date | null;

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty()
  readonly updatedAt: Date;
}
