import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MinLength,
  MaxLength,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(100)
  @ApiProperty({ description: 'Task title', minLength: 5, maxLength: 100 })
  readonly title: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  @ApiPropertyOptional({ description: 'Task description', maxLength: 500 })
  readonly description?: string;

  @IsString()
  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH'])
  @ApiPropertyOptional({
    description: 'Priority of the task',
    example: 'MEDIUM',
    enum: ['LOW', 'MEDIUM', 'HIGH'],
  })
  readonly priority?: string;
}
