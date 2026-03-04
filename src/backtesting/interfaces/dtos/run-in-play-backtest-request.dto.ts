import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class RunInPlayBacktestRequestDto {
  @ApiPropertyOptional({ example: 'BTCUSDT' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9_]+$/)
  readonly symbol?: string;

  @ApiPropertyOptional({ example: 10000, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  readonly initialBalance?: number;

  @ApiPropertyOptional({ example: 2, minimum: 0.0001, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  @Max(100)
  readonly riskPercent?: number;

  @ApiPropertyOptional({ example: 2, minimum: 0.0001 })
  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  readonly rewardRatio?: number;

  @ApiPropertyOptional({ example: 0.8, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly minFvgSizePercent?: number;

  @ApiPropertyOptional({ example: 4, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly maxFvgSizePercent?: number;
}
