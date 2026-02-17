import { ApiProperty } from '@nestjs/swagger';

export class CancelBacktestRunResponseDto {
  @ApiProperty()
  readonly runId: string;

  @ApiProperty({
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
  })
  readonly status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
}
