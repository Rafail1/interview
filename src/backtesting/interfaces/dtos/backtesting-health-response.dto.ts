import { ApiProperty } from '@nestjs/swagger';

export class BacktestingHealthResponseDto {
  @ApiProperty({ example: 'ok' })
  readonly status: 'ok';

  @ApiProperty({ example: 'backtesting' })
  readonly service: 'backtesting';

  @ApiProperty({ example: '2026-02-17T10:00:00.000Z' })
  readonly timestamp: string;
}
