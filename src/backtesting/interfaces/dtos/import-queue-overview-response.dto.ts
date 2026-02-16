import { ApiProperty } from '@nestjs/swagger';

class ImportQueueJobDto {
  @ApiProperty()
  readonly jobId: string;

  @ApiProperty()
  readonly symbol: string;

  @ApiProperty()
  readonly interval: string;

  @ApiProperty()
  readonly queuedPosition: number;
}

export class ImportQueueOverviewResponseDto {
  @ApiProperty()
  readonly queueSize: number;

  @ApiProperty()
  readonly activeImports: number;

  @ApiProperty()
  readonly maxConcurrentImports: number;

  @ApiProperty({ type: [ImportQueueJobDto] })
  readonly queuedJobs: ImportQueueJobDto[];
}
