import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export class ListInPlayRunsQueryDto {
  @ApiPropertyOptional({ enum: ['pending', 'running', 'completed', 'failed'] })
  @IsOptional()
  @IsIn(['pending', 'running', 'completed', 'failed'])
  readonly status?: 'pending' | 'running' | 'completed' | 'failed';

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly limit?: number;
}
