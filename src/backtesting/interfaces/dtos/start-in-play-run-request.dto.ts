import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class StartInPlayRunRequestDto {
  @ApiPropertyOptional({
    type: [String],
    description: 'Optional symbols list. If omitted, symbols are auto-detected from local market_data.',
    example: ['BTCUSDT', 'ETHUSDT'],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  readonly symbols?: string[];

  @ApiProperty({ example: '15m' })
  @IsString()
  readonly interval: string;

  @ApiProperty({ example: '2026-02-01T00:00:00.000Z' })
  @IsDateString()
  readonly startDate: string;

  @ApiProperty({ example: '2026-02-28T23:59:59.999Z' })
  @IsDateString()
  readonly endDate: string;

  @ApiPropertyOptional({ default: 24 })
  @IsOptional()
  @IsInt()
  @Min(2)
  readonly windowSize?: number;

  @ApiPropertyOptional({
    enum: ['both', 'either'],
    default: 'both',
    description:
      'both: require volume and volatility thresholds. either: require any threshold.',
  })
  @IsOptional()
  @IsIn(['both', 'either'])
  readonly activationMode?: 'both' | 'either';

  @ApiPropertyOptional({ default: '100000000' })
  @IsOptional()
  @IsString()
  readonly quoteVolumeThreshold?: string;

  @ApiPropertyOptional({ default: '3' })
  @IsOptional()
  @IsString()
  readonly volatilityThreshold?: string;
}
