import { ApiProperty } from '@nestjs/swagger';
import type { ImportJobStatus } from 'src/backtesting/domain/interfaces/download-manager.interface';

export class ImportBinanceDataResponseDto {
  @ApiProperty()
  readonly jobId: string;

  @ApiProperty({ enum: ['pending', 'downloading', 'completed', 'failed'] })
  readonly status: ImportJobStatus;

  @ApiProperty()
  readonly filesQueued: number;

  @ApiProperty()
  readonly downloadedCount: number;

  @ApiProperty({
    nullable: true,
    description: '1-based position in import queue',
  })
  readonly queuedPosition: number | null;
}
