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
import { GetImportQueueOverviewUseCase } from 'src/backtesting/application/use-cases/get-import-queue-overview.use-case';
import { ImportBinanceDataUseCase } from 'src/backtesting/application/use-cases/import-binance-data.use-case';
import { GetBacktestRunUseCase } from 'src/backtesting/application/use-cases/get-backtest-run.use-case';
import { RunBacktestUseCase } from 'src/backtesting/application/use-cases/run-backtest.use-case';
import { BacktestRunResponseDto } from '../dtos/backtest-run-response.dto';
import { ImportBinanceDataRequestDto } from '../dtos/import-binance-data-request.dto';
import { ImportBinanceDataResponseDto } from '../dtos/import-binance-data-response.dto';
import { ImportJobStatusResponseDto } from '../dtos/import-job-status-response.dto';
import { ImportQueueOverviewResponseDto } from '../dtos/import-queue-overview-response.dto';
import { RunBacktestRequestDto } from '../dtos/run-backtest-request.dto';
import { RunBacktestResponseDto } from '../dtos/run-backtest-response.dto';

@ApiTags('backtesting')
@Controller('backtesting')
export class BacktestingController {
  constructor(
    private readonly importBinanceDataUseCase: ImportBinanceDataUseCase,
    private readonly getImportJobStatusUseCase: GetImportJobStatusUseCase,
    private readonly getImportQueueOverviewUseCase: GetImportQueueOverviewUseCase,
    private readonly runBacktestUseCase: RunBacktestUseCase,
    private readonly getBacktestRunUseCase: GetBacktestRunUseCase,
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
      if (error instanceof Error && this.isClientInputError(error.message)) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Post('run')
  @ApiOperation({ summary: 'Run backtest on imported market data' })
  @ApiCreatedResponse({ type: RunBacktestResponseDto })
  public async runBacktest(
    @Body() body: RunBacktestRequestDto,
  ): Promise<RunBacktestResponseDto> {
    try {
      return await this.runBacktestUseCase.execute(body);
    } catch (error) {
      if (error instanceof Error && this.isClientInputError(error.message)) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get('import/queue')
  @ApiOperation({ summary: 'Get live import queue overview' })
  @ApiOkResponse({ type: ImportQueueOverviewResponseDto })
  public getImportQueueOverview(): ImportQueueOverviewResponseDto {
    return this.getImportQueueOverviewUseCase.execute();
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

  @Get('run/:runId')
  @ApiOperation({ summary: 'Get persisted backtest run by ID' })
  @ApiOkResponse({ type: BacktestRunResponseDto })
  @ApiNotFoundResponse({ description: 'Backtest run not found' })
  public async getBacktestRun(
    @Param('runId') runId: string,
  ): Promise<BacktestRunResponseDto> {
    const run = await this.getBacktestRunUseCase.execute(runId);
    if (!run) {
      throw new NotFoundException(`Backtest run not found: ${runId}`);
    }
    return run;
  }

  private isClientInputError(message: string): boolean {
    return (
      message === 'startDate must be before or equal to endDate' ||
      message === 'Date range cannot be in the future' ||
      message.startsWith('Invalid timeframe:')
    );
  }
}
