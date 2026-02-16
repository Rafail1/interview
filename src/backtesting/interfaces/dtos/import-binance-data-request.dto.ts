import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class ImportBinanceDataRequestDto {
  @IsString()
  @Matches(/^[A-Z0-9_]+$/)
  @ApiProperty({ example: 'BTCUSDT' })
  readonly symbol: string;

  @IsString()
  @ApiProperty({ example: '1m' })
  readonly interval: string;

  @IsDateString()
  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  readonly startDate: string;

  @IsDateString()
  @ApiProperty({ example: '2024-03-31T23:59:59.999Z' })
  readonly endDate: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ default: false })
  readonly overwrite?: boolean;
}
