import { ApiProperty } from '@nestjs/swagger';

export class CandleIngestionRunnerStatusResponseDto {
  @ApiProperty()
  readonly queuedJobs: number;

  @ApiProperty()
  readonly runningJobs: number;

  @ApiProperty()
  readonly maxConcurrentJobs: number;

  @ApiProperty()
  readonly maxConcurrentSymbols: number;

  @ApiProperty()
  readonly maxApiConcurrency: number;

  @ApiProperty()
  readonly apiInFlight: number;
}
