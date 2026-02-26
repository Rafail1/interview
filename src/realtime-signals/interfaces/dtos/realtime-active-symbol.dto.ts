import { ApiProperty } from '@nestjs/swagger';

export class RealtimeActiveSymbolDto {
  @ApiProperty()
  readonly symbol: string;

  @ApiProperty()
  readonly tradesPerSecond: number;

  @ApiProperty()
  readonly lastActiveAt: string;
}
