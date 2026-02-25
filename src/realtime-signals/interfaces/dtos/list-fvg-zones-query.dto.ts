import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ListFvgZonesQueryDto {
  @ApiPropertyOptional({
    description: 'Optional symbol filter, e.g. BTCUSDT',
  })
  @IsOptional()
  @IsString()
  readonly symbol?: string;
}
