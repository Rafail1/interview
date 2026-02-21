import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class StopSymbolTrackingRequestDto {
  @IsString()
  @Matches(/^[A-Z0-9_]+$/)
  @ApiProperty({ example: 'BTCUSDT' })
  readonly symbol: string;
}

