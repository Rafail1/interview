import { ApiProperty } from '@nestjs/swagger';

export class StartMarketActivityTrackerResponseDto {
  @ApiProperty()
  readonly started: boolean;

  @ApiProperty()
  readonly symbolsTracked: number;
}
