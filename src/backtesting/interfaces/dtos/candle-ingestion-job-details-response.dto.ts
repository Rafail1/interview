import { ApiProperty } from '@nestjs/swagger';
import { CandleIngestionJobStatusResponseDto } from './candle-ingestion-job-status-response.dto';

class CandleIngestionJobSymbolRunStatsDto {
  @ApiProperty()
  readonly total: number;

  @ApiProperty()
  readonly pending: number;

  @ApiProperty()
  readonly running: number;

  @ApiProperty()
  readonly completed: number;

  @ApiProperty()
  readonly failed: number;

  @ApiProperty()
  readonly skipped: number;
}

export class CandleIngestionJobDetailsResponseDto {
  @ApiProperty({ type: CandleIngestionJobStatusResponseDto })
  readonly job: CandleIngestionJobStatusResponseDto;

  @ApiProperty({ type: CandleIngestionJobSymbolRunStatsDto })
  readonly symbolRunStats: CandleIngestionJobSymbolRunStatsDto;

  @ApiProperty({
    description:
      'Estimated progress by processed symbols (completed + failed + skipped) / total.',
    example: 42.5,
  })
  readonly progressPercent: number;

  @ApiProperty({
    nullable: true,
    description:
      'Estimated completion time. Null when ETA cannot be estimated or job is not running.',
  })
  readonly eta: Date | null;
}
