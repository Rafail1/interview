import { ApiProperty } from '@nestjs/swagger';
import type { ImportJobStatus } from 'src/backtesting/domain/interfaces/download-manager.interface';

export class ImportJobStatusResponseDto {
  @ApiProperty()
  readonly jobId: string;

  @ApiProperty({ enum: ['pending', 'downloading', 'completed', 'failed'] })
  readonly status: ImportJobStatus;

  @ApiProperty({
    nullable: true,
    description: '1-based position in import queue',
  })
  readonly queuedPosition: number | null;

  @ApiProperty({ description: 'Current total queue size' })
  readonly queueSize: number;

  @ApiProperty({ description: 'True if this job is still queued' })
  readonly isQueued: boolean;

  @ApiProperty({
    description: 'Number of currently running import workers',
  })
  readonly activeImports: number;

  @ApiProperty({
    description: 'Maximum number of concurrent import workers',
  })
  readonly maxConcurrentImports: number;

  @ApiProperty()
  readonly symbol: string;

  @ApiProperty()
  readonly interval: string;

  @ApiProperty()
  readonly totalFiles: number;

  @ApiProperty()
  readonly downloadedFiles: number;

  @ApiProperty()
  readonly failedFiles: number;

  @ApiProperty()
  readonly checksumValid: boolean;

  @ApiProperty({ nullable: true })
  readonly errorMessage: string | null;

  @ApiProperty({ nullable: true })
  readonly lastSuccessfulTime: string | null;

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty()
  readonly updatedAt: Date;
}
