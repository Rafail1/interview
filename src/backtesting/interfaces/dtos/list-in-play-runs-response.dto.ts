import { ApiProperty } from '@nestjs/swagger';
import { InPlayRunStatusResponseDto } from './in-play-run-status-response.dto';

export class ListInPlayRunsResponseDto {
  @ApiProperty({ type: [InPlayRunStatusResponseDto] })
  readonly items: InPlayRunStatusResponseDto[];

  @ApiProperty()
  readonly page: number;

  @ApiProperty()
  readonly limit: number;

  @ApiProperty()
  readonly total: number;
}
