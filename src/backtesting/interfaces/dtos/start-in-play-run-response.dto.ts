import { ApiProperty } from '@nestjs/swagger';

export class StartInPlayRunResponseDto {
  @ApiProperty()
  readonly runId: string;

  @ApiProperty({ enum: ['pending', 'running', 'completed', 'failed'] })
  readonly status: 'pending' | 'running' | 'completed' | 'failed';
}
