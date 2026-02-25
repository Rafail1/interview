import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ListTrackedSymbolsUseCase } from 'src/realtime-signals/application/use-cases/list-tracked-symbols.use-case';
import { ListFvgZonesUseCase } from 'src/realtime-signals/application/use-cases/list-fvg-zones.use-case';
import { StartSymbolTrackingUseCase } from 'src/realtime-signals/application/use-cases/start-symbol-tracking.use-case';
import { StopSymbolTrackingUseCase } from 'src/realtime-signals/application/use-cases/stop-symbol-tracking.use-case';
import { ListFvgZonesQueryDto } from '../dtos/list-fvg-zones-query.dto';
import { ListFvgZonesResponseDto } from '../dtos/list-fvg-zones-response.dto';
import { ListTrackedSymbolsResponseDto } from '../dtos/list-tracked-symbols-response.dto';
import { StartSymbolTrackingRequestDto } from '../dtos/start-symbol-tracking-request.dto';
import { StartSymbolTrackingResponseDto } from '../dtos/start-symbol-tracking-response.dto';
import { StopSymbolTrackingRequestDto } from '../dtos/stop-symbol-tracking-request.dto';
import { StopSymbolTrackingResponseDto } from '../dtos/stop-symbol-tracking-response.dto';

@ApiTags('realtime-signals')
@Controller('realtime-signals')
export class RealtimeSignalsController {
  constructor(
    private readonly startSymbolTrackingUseCase: StartSymbolTrackingUseCase,
    private readonly stopSymbolTrackingUseCase: StopSymbolTrackingUseCase,
    private readonly listTrackedSymbolsUseCase: ListTrackedSymbolsUseCase,
    private readonly listFvgZonesUseCase: ListFvgZonesUseCase,
  ) {}

  @Post('track')
  @ApiOperation({ summary: 'Start tracking one or more symbols in realtime' })
  @ApiCreatedResponse({ type: StartSymbolTrackingResponseDto })
  public async startTracking(
    @Body() body: StartSymbolTrackingRequestDto,
  ): Promise<StartSymbolTrackingResponseDto> {
    try {
      return await this.startSymbolTrackingUseCase.execute(body);
    } catch (error) {
      if (error instanceof Error && this.isClientInputError(error.message)) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Post('untrack')
  @ApiOperation({ summary: 'Stop tracking a symbol in realtime' })
  @ApiOkResponse({ type: StopSymbolTrackingResponseDto })
  public stopTracking(
    @Body() body: StopSymbolTrackingRequestDto,
  ): StopSymbolTrackingResponseDto {
    try {
      return this.stopSymbolTrackingUseCase.execute(body);
    } catch (error) {
      if (error instanceof Error && this.isClientInputError(error.message)) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get('tracked')
  @ApiOperation({ summary: 'List currently tracked symbols' })
  @ApiOkResponse({ type: ListTrackedSymbolsResponseDto })
  public listTrackedSymbols(): ListTrackedSymbolsResponseDto {
    return this.listTrackedSymbolsUseCase.execute();
  }

  @Get('fvg-zones')
  @ApiOperation({ summary: 'List in-memory realtime FVG zones' })
  @ApiOkResponse({ type: ListFvgZonesResponseDto })
  public listFvgZones(
    @Query() query: ListFvgZonesQueryDto,
  ): ListFvgZonesResponseDto {
    try {
      return this.listFvgZonesUseCase.execute(query);
    } catch (error) {
      if (error instanceof Error && this.isClientInputError(error.message)) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private isClientInputError(message: string): boolean {
    return (
      message === 'symbols must contain at least one valid symbol' ||
      message.startsWith('Invalid symbol:')
    );
  }
}
