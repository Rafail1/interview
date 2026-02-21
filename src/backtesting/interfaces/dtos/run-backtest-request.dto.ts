import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Matches,
  Min,
} from 'class-validator';

export class RunBacktestRequestDto {
  @IsString()
  @Matches(/^[A-Z0-9_]+$/)
  @ApiProperty({ example: 'BTCUSDT' })
  readonly symbol: string;

  @IsDateString()
  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  readonly startDate: string;

  @IsDateString()
  @ApiProperty({ example: '2024-01-31T23:59:59.999Z' })
  readonly endDate: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: '1m', default: '1m' })
  readonly fromInterval?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: '15m', default: '15m' })
  readonly toInterval?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @ApiPropertyOptional({ example: 10000, default: 10000 })
  readonly initialBalance?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @ApiPropertyOptional({ example: 2, default: 2 })
  readonly riskPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @ApiPropertyOptional({ example: 2, default: 2 })
  readonly rewardRatio?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @ApiPropertyOptional({
    example: 0.8,
    default: 0.8,
    description: 'Skip FVG zones smaller than this percent of price',
  })
  readonly minFvgSizePercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @ApiPropertyOptional({
    example: 4,
    default: 4,
    description: 'Skip FVG zones larger than this percent of price',
  })
  readonly maxFvgSizePercent?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({
    example: 1440,
    description:
      'Force-close any open trade after this many minutes if SL/TP did not trigger',
  })
  readonly maxHoldMinutes?: number;
}
