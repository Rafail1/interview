import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class StartCandleIngestionJobRequestDto {
  @ApiProperty({ enum: ['backfill', 'incremental'], default: 'incremental' })
  @IsIn(['backfill', 'incremental'])
  readonly mode: 'backfill' | 'incremental';

  @ApiProperty({ example: '4h', default: '4h' })
  @IsString()
  readonly interval: string;

  @ApiPropertyOptional({ default: 1000, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  readonly backfillCandles?: number;

  @ApiPropertyOptional({
    description: 'Optional freshness target time in UTC ISO string',
    example: '2026-03-02T12:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  readonly freshnessTarget?: string;
}
