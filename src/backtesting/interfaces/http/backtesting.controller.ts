import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
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
import { GetBacktestRunSignalsUseCase } from 'src/backtesting/application/use-cases/get-backtest-run-signals.use-case';
import { GetBacktestRunEquityUseCase } from 'src/backtesting/application/use-cases/get-backtest-run-equity.use-case';
import { ListBacktestRunsUseCase } from 'src/backtesting/application/use-cases/list-backtest-runs.use-case';
import { RunBacktestUseCase } from 'src/backtesting/application/use-cases/run-backtest.use-case';
import { BacktestRunEquityResponseDto } from '../dtos/backtest-run-equity-response.dto';
import { BacktestRunResponseDto } from '../dtos/backtest-run-response.dto';
import { BacktestRunSignalsResponseDto } from '../dtos/backtest-run-signals-response.dto';
import { ImportBinanceDataRequestDto } from '../dtos/import-binance-data-request.dto';
import { ImportBinanceDataResponseDto } from '../dtos/import-binance-data-response.dto';
import { ImportJobStatusResponseDto } from '../dtos/import-job-status-response.dto';
import { ImportQueueOverviewResponseDto } from '../dtos/import-queue-overview-response.dto';
import { ListBacktestRunsQueryDto } from '../dtos/list-backtest-runs-query.dto';
import { ListBacktestRunsResponseDto } from '../dtos/list-backtest-runs-response.dto';
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
    private readonly getBacktestRunSignalsUseCase: GetBacktestRunSignalsUseCase,
    private readonly getBacktestRunEquityUseCase: GetBacktestRunEquityUseCase,
    private readonly listBacktestRunsUseCase: ListBacktestRunsUseCase,
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

  @Get('runs')
  @ApiOperation({ summary: 'List persisted backtest runs' })
  @ApiOkResponse({ type: ListBacktestRunsResponseDto })
  public async listBacktestRuns(
    @Query() query: ListBacktestRunsQueryDto,
  ): Promise<ListBacktestRunsResponseDto> {
    try {
      return await this.listBacktestRunsUseCase.execute(query);
    } catch (error) {
      if (error instanceof Error && this.isClientInputError(error.message)) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
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

  @Get('run/:runId/signals')
  @ApiOperation({ summary: 'Get persisted signal events for a backtest run' })
  @ApiOkResponse({ type: BacktestRunSignalsResponseDto })
  @ApiNotFoundResponse({ description: 'Backtest run not found' })
  public async getBacktestRunSignals(
    @Param('runId') runId: string,
  ): Promise<BacktestRunSignalsResponseDto> {
    const signals = await this.getBacktestRunSignalsUseCase.execute(runId);
    if (!signals) {
      throw new NotFoundException(`Backtest run not found: ${runId}`);
    }

    return { items: signals };
  }

  @Get('run/:runId/equity')
  @ApiOperation({
    summary: 'Get persisted equity curve points for a backtest run',
  })
  @ApiOkResponse({ type: BacktestRunEquityResponseDto })
  @ApiNotFoundResponse({ description: 'Backtest run not found' })
  public async getBacktestRunEquity(
    @Param('runId') runId: string,
  ): Promise<BacktestRunEquityResponseDto> {
    const equityPoints = await this.getBacktestRunEquityUseCase.execute(runId);
    if (!equityPoints) {
      throw new NotFoundException(`Backtest run not found: ${runId}`);
    }

    return { items: equityPoints };
  }

  private isClientInputError(message: string): boolean {
    return (
      message === 'startDate must be before or equal to endDate' ||
      message === 'fromDate must be before or equal to toDate' ||
      message === 'Date range cannot be in the future' ||
      message.startsWith('Invalid timeframe:')
    );
  }
}
