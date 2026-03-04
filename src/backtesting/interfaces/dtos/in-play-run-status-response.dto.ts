import { ApiProperty } from '@nestjs/swagger';

export class InPlayRunStatusResponseDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty({ enum: ['pending', 'running', 'completed', 'failed'] })
  readonly status: 'pending' | 'running' | 'completed' | 'failed';

  @ApiProperty({ nullable: true })
  readonly errorMessage: string | null;

  @ApiProperty()
  readonly interval: string;

  @ApiProperty()
  readonly startTime: string;

  @ApiProperty()
  readonly endTime: string;

  @ApiProperty({ nullable: true, type: [String] })
  readonly symbols: string[] | null;

  @ApiProperty({ enum: ['both', 'either'] })
  readonly activationMode: 'both' | 'either';

  @ApiProperty()
  readonly windowSize: number;

  @ApiProperty()
  readonly quoteVolumeThreshold: string;

  @ApiProperty()
  readonly volatilityThreshold: string;

  @ApiProperty()
  readonly totalSymbols: number;

  @ApiProperty()
  readonly processedSymbols: number;

  @ApiProperty()
  readonly rangesCount: number;

  @ApiProperty({ nullable: true })
  readonly startedAt: Date | null;

  @ApiProperty({ nullable: true })
  readonly completedAt: Date | null;

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty()
  readonly updatedAt: Date;
}
