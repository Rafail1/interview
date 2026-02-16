import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class ListBacktestRunsQueryDto {
  @IsOptional()
  @IsIn(['createdAt', 'winRate', 'totalPnL'])
  @ApiPropertyOptional({
    enum: ['createdAt', 'winRate', 'totalPnL'],
    default: 'createdAt',
    description:
      'Sort field. totalPnL is sorted numerically at DB level, not lexicographically.',
  })
  readonly sortBy?: 'createdAt' | 'winRate' | 'totalPnL';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  readonly sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9_]+$/)
  @ApiPropertyOptional({ example: 'BTCUSDT' })
  readonly symbol?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: '15m' })
  readonly interval?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  readonly fromDate?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ example: '2024-12-31T23:59:59.999Z' })
  readonly toDate?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({ default: 1 })
  readonly page?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({ default: 20 })
  readonly limit?: number;
}
