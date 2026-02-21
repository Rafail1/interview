import { ApiProperty } from '@nestjs/swagger';

export class RealtimeTrackedSymbolDto {
  @ApiProperty({ example: 'BTCUSDT' })
  readonly symbol: string;

  @ApiProperty({ example: 12 })
  readonly activeFvgCount: number;

  @ApiProperty({ example: '2026-02-21T18:00:00.000Z' })
  readonly startedAt: string;
}

