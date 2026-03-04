import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class GenerateInPlayEntryWindowsRequestDto {
  @ApiPropertyOptional({ example: 'BTCUSDT' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9_]+$/)
  readonly symbol?: string;
}
