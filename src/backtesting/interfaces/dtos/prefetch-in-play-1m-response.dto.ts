import { ApiProperty } from '@nestjs/swagger';

class PrefetchInPlay1mJobDto {
  @ApiProperty()
  readonly symbol: string;

  @ApiProperty()
  readonly fromTime: string;

  @ApiProperty()
  readonly toTime: string;

  @ApiProperty()
  readonly fromDate: string;

  @ApiProperty()
  readonly toDate: string;

  @ApiProperty()
  readonly jobId: string;

  @ApiProperty({ enum: ['pending', 'downloading', 'completed', 'failed'] })
  readonly status: 'pending' | 'downloading' | 'completed' | 'failed';

  @ApiProperty()
  readonly filesQueued: number;

  @ApiProperty()
  readonly downloadedCount: number;

  @ApiProperty({ nullable: true })
  readonly queuedPosition: number | null;
}

export class PrefetchInPlay1mResponseDto {
  @ApiProperty()
  readonly runId: string;

  @ApiProperty()
  readonly interval: '1m';

  @ApiProperty()
  readonly symbols: number;

  @ApiProperty({ type: [PrefetchInPlay1mJobDto] })
  readonly jobs: PrefetchInPlay1mJobDto[];
}

