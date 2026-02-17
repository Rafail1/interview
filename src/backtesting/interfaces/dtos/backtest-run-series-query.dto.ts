import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

export class BacktestRunSeriesQueryDto {
  @IsOptional()
  @Matches(/^\d+:[0-9a-fA-F-]{36}$/)
  @ApiPropertyOptional({
    description: 'Cursor in format "<timestampMs>:<uuid>"',
    example: '1704067200000:5d951645-7b12-4af4-8f5d-0f7d2782d8ba',
  })
  readonly cursor?: string;

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
