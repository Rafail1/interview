import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class ListCandleIngestionJobsQueryDto {
  @IsOptional()
  @IsIn(['createdAt', 'updatedAt'])
  @ApiPropertyOptional({ enum: ['createdAt', 'updatedAt'], default: 'createdAt' })
  readonly sortBy?: 'createdAt' | 'updatedAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  readonly sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsIn([
    'pending',
    'running',
    'completed',
    'failed',
    'cancelled',
    'completed_with_errors',
  ])
  @ApiPropertyOptional({
    enum: [
      'pending',
      'running',
      'completed',
      'failed',
      'cancelled',
      'completed_with_errors',
    ],
  })
  readonly status?:
    | 'pending'
    | 'running'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'completed_with_errors';

  @IsOptional()
  @IsIn(['backfill', 'incremental'])
  @ApiPropertyOptional({ enum: ['backfill', 'incremental'] })
  readonly mode?: 'backfill' | 'incremental';

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: '4h' })
  readonly interval?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ example: '2026-03-01T00:00:00.000Z' })
  readonly fromDate?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ example: '2026-03-03T23:59:59.999Z' })
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
