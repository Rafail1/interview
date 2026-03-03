import { ApiProperty } from '@nestjs/swagger';

export class MarketActivityTrackerStatusResponseDto {
  @ApiProperty()
  readonly started: boolean;

  @ApiProperty()
  readonly starting: boolean;

  @ApiProperty()
  readonly trackedSymbols: number;

  @ApiProperty()
  readonly activeSymbols: number;

  @ApiProperty()
  readonly sockets: number;
}
