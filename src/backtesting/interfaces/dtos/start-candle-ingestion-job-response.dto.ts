import { ApiProperty } from '@nestjs/swagger';

export class StartCandleIngestionJobResponseDto {
  @ApiProperty()
  readonly jobId: string;

  @ApiProperty({ enum: ['pending', 'running'] })
  readonly status: 'pending' | 'running';

  @ApiProperty()
  readonly configHash: string;
}
