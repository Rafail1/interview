import { ApiProperty } from '@nestjs/swagger';

export class CancelCandleIngestionJobResponseDto {
  @ApiProperty()
  readonly jobId: string;

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
}
