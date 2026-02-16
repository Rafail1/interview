import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { GetImportJobStatusUseCase } from 'src/backtesting/application/use-cases/get-import-job-status.use-case';
import { ImportBinanceDataUseCase } from 'src/backtesting/application/use-cases/import-binance-data.use-case';
import { ImportBinanceDataRequestDto } from '../dtos/import-binance-data-request.dto';
import { ImportBinanceDataResponseDto } from '../dtos/import-binance-data-response.dto';
import { ImportJobStatusResponseDto } from '../dtos/import-job-status-response.dto';

@ApiTags('backtesting')
@Controller('backtesting')
export class BacktestingController {
  constructor(
    private readonly importBinanceDataUseCase: ImportBinanceDataUseCase,
    private readonly getImportJobStatusUseCase: GetImportJobStatusUseCase,
  ) {}

  @Post('import')
  @ApiOperation({ summary: 'Trigger Binance futures kline data import job' })
  @ApiCreatedResponse({ type: ImportBinanceDataResponseDto })
  public async importBinanceData(
    @Body() body: ImportBinanceDataRequestDto,
  ): Promise<ImportBinanceDataResponseDto> {
    try {
      return await this.importBinanceDataUseCase.execute(body);
    } catch (error) {
      if (
        error instanceof Error &&
        this.isImportRequestValidationError(error.message)
      ) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get('import/:jobId')
  @ApiOperation({ summary: 'Get Binance import job status' })
  @ApiOkResponse({ type: ImportJobStatusResponseDto })
  @ApiNotFoundResponse({ description: 'Import job not found' })
  public async getImportJobStatus(
    @Param('jobId') jobId: string,
  ): Promise<ImportJobStatusResponseDto> {
    const status = await this.getImportJobStatusUseCase.execute(jobId);
    if (!status) {
      throw new NotFoundException(`Import job not found: ${jobId}`);
    }
    return status;
  }

  private isImportRequestValidationError(message: string): boolean {
    return (
      message === 'startDate must be before or equal to endDate' ||
      message === 'Date range cannot be in the future' ||
      message.startsWith('Invalid timeframe:')
    );
  }
}
