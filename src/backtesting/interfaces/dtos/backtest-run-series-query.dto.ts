import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

export class BacktestRunSeriesQueryDto {
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
  @Max(1000)
  @ApiPropertyOptional({ default: 100, maximum: 1000 })
  readonly limit?: number;

  @IsOptional()
  @Matches(/^\d+$/)
  @ApiPropertyOptional({ description: 'Lower bound timestamp (ms unix)' })
  readonly fromTs?: string;

  @IsOptional()
  @Matches(/^\d+$/)
  @ApiPropertyOptional({ description: 'Upper bound timestamp (ms unix)' })
  readonly toTs?: string;
}
