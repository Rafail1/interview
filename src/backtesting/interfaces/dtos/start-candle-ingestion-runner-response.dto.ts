import { ApiProperty } from '@nestjs/swagger';

export class StartCandleIngestionRunnerResponseDto {
  @ApiProperty()
  readonly resumedJobs: number;
}
