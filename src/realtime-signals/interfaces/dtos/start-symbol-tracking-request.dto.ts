import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsString, Matches } from 'class-validator';

export class StartSymbolTrackingRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @Matches(/^[A-Z0-9_]+$/, { each: true })
  @ApiProperty({ example: ['BTCUSDT', 'ETHUSDT'] })
  readonly symbols: string[];
}

