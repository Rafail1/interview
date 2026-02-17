import { ApiProperty } from '@nestjs/swagger';

class BacktestEquityPointDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty()
  readonly timestamp: string;

  @ApiProperty()
  readonly equity: string;

  @ApiProperty()
  readonly drawdown: string;

  @ApiProperty()
  readonly createdAt: Date;
}

export class BacktestRunEquityResponseDto {
  @ApiProperty({ type: [BacktestEquityPointDto] })
  readonly items: BacktestEquityPointDto[];

  @ApiProperty()
  readonly limit: number;

  @ApiProperty()
  readonly total: number;

  @ApiProperty({ nullable: true })
  readonly nextCursor: string | null;
}
