import { ApiProperty } from '@nestjs/swagger';
import { ListInPlayEntryWindowsResponseDto } from './list-in-play-entry-windows-response.dto';

export class GenerateInPlayEntryWindowsResponseDto extends ListInPlayEntryWindowsResponseDto {
  @ApiProperty()
  readonly generatedCount: number;
}
