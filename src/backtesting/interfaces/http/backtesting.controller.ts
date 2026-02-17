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
import { CancelBacktestRunUseCase } from 'src/backtesting/application/use-cases/cancel-backtest-run.use-case';
import { GetBacktestRunProgressUseCase } from 'src/backtesting/application/use-cases/get-backtest-run-progress.use-case';
import { GetBacktestRunSummaryUseCase } from 'src/backtesting/application/use-cases/get-backtest-run-summary.use-case';
import { GetBacktestRunSignalsUseCase } from 'src/backtesting/application/use-cases/get-backtest-run-signals.use-case';
import { GetBacktestRunEquityUseCase } from 'src/backtesting/application/use-cases/get-backtest-run-equity.use-case';
import { ListBacktestRunsUseCase } from 'src/backtesting/application/use-cases/list-backtest-runs.use-case';
import { ListActiveBacktestRunsUseCase } from 'src/backtesting/application/use-cases/list-active-backtest-runs.use-case';
import { RunBacktestUseCase } from 'src/backtesting/application/use-cases/run-backtest.use-case';
import { BacktestRunEquityResponseDto } from '../dtos/backtest-run-equity-response.dto';
import { BacktestingHealthResponseDto } from '../dtos/backtesting-health-response.dto';
import { BacktestRunResponseDto } from '../dtos/backtest-run-response.dto';
import { BacktestRunProgressResponseDto } from '../dtos/backtest-run-progress-response.dto';
import { BacktestRunSummaryResponseDto } from '../dtos/backtest-run-summary-response.dto';
import { BacktestRunSeriesQueryDto } from '../dtos/backtest-run-series-query.dto';
import { BacktestRunSignalsResponseDto } from '../dtos/backtest-run-signals-response.dto';
import { CancelBacktestRunResponseDto } from '../dtos/cancel-backtest-run-response.dto';
import { ImportBinanceDataRequestDto } from '../dtos/import-binance-data-request.dto';
import { ImportBinanceDataResponseDto } from '../dtos/import-binance-data-response.dto';
import { ImportJobStatusResponseDto } from '../dtos/import-job-status-response.dto';
import { ImportQueueOverviewResponseDto } from '../dtos/import-queue-overview-response.dto';
import { ListBacktestRunsQueryDto } from '../dtos/list-backtest-runs-query.dto';
import { ListBacktestRunsResponseDto } from '../dtos/list-backtest-runs-response.dto';
import { ListActiveBacktestRunsResponseDto } from '../dtos/list-active-backtest-runs-response.dto';
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
    private readonly cancelBacktestRunUseCase: CancelBacktestRunUseCase,
    private readonly getBacktestRunUseCase: GetBacktestRunUseCase,
    private readonly getBacktestRunProgressUseCase: GetBacktestRunProgressUseCase,
    private readonly getBacktestRunSummaryUseCase: GetBacktestRunSummaryUseCase,
    private readonly getBacktestRunSignalsUseCase: GetBacktestRunSignalsUseCase,
    private readonly getBacktestRunEquityUseCase: GetBacktestRunEquityUseCase,
    private readonly listBacktestRunsUseCase: ListBacktestRunsUseCase,
    private readonly listActiveBacktestRunsUseCase: ListActiveBacktestRunsUseCase,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Backtesting module healthcheck' })
  @ApiOkResponse({ type: BacktestingHealthResponseDto })
  public getHealth(): BacktestingHealthResponseDto {
    return {
      status: 'ok',
      service: 'backtesting',
      timestamp: new Date().toISOString(),
    };
  }

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

  @Post('run/:runId/cancel')
  @ApiOperation({ summary: 'Request cancellation of a running backtest' })
  @ApiOkResponse({ type: CancelBacktestRunResponseDto })
  @ApiNotFoundResponse({ description: 'Backtest run not found' })
  public async cancelBacktestRun(
    @Param('runId') runId: string,
  ): Promise<CancelBacktestRunResponseDto> {
    const run = await this.cancelBacktestRunUseCase.execute(runId);
    if (!run) {
      throw new NotFoundException(`Backtest run not found: ${runId}`);
    }
    return run;
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

  @Get('runs/active')
  @ApiOperation({ summary: 'List active backtest runs (pending/running)' })
  @ApiOkResponse({ type: ListActiveBacktestRunsResponseDto })
  public async listActiveBacktestRuns(): Promise<ListActiveBacktestRunsResponseDto> {
    return this.listActiveBacktestRunsUseCase.execute();
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

  @Get('run/:runId/progress')
  @ApiOperation({ summary: 'Get backtest run progress for polling' })
  @ApiOkResponse({ type: BacktestRunProgressResponseDto })
  @ApiNotFoundResponse({ description: 'Backtest run not found' })
  public async getBacktestRunProgress(
    @Param('runId') runId: string,
  ): Promise<BacktestRunProgressResponseDto> {
    const progress = await this.getBacktestRunProgressUseCase.execute(runId);
    if (!progress) {
      throw new NotFoundException(`Backtest run not found: ${runId}`);
    }
    return progress;
  }

  @Get('run/:runId/summary')
  @ApiOperation({ summary: 'Get compact persisted summary for a backtest run' })
  @ApiOkResponse({ type: BacktestRunSummaryResponseDto })
  @ApiNotFoundResponse({ description: 'Backtest run not found' })
  public async getBacktestRunSummary(
    @Param('runId') runId: string,
  ): Promise<BacktestRunSummaryResponseDto> {
    const summary = await this.getBacktestRunSummaryUseCase.execute(runId);
    if (!summary) {
      throw new NotFoundException(`Backtest run not found: ${runId}`);
    }
    return summary;
  }

  @Get('run/:runId/signals')
  @ApiOperation({ summary: 'Get persisted signal events for a backtest run' })
  @ApiOkResponse({ type: BacktestRunSignalsResponseDto })
  @ApiNotFoundResponse({ description: 'Backtest run not found' })
  public async getBacktestRunSignals(
    @Param('runId') runId: string,
    @Query() query: BacktestRunSeriesQueryDto,
  ): Promise<BacktestRunSignalsResponseDto> {
    try {
      const signals = await this.getBacktestRunSignalsUseCase.execute(
        runId,
        query,
      );
      if (!signals) {
        throw new NotFoundException(`Backtest run not found: ${runId}`);
      }
      return signals;
    } catch (error) {
      if (error instanceof Error && this.isClientInputError(error.message)) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get('run/:runId/equity')
  @ApiOperation({
    summary: 'Get persisted equity curve points for a backtest run',
  })
  @ApiOkResponse({ type: BacktestRunEquityResponseDto })
  @ApiNotFoundResponse({ description: 'Backtest run not found' })
  public async getBacktestRunEquity(
    @Param('runId') runId: string,
    @Query() query: BacktestRunSeriesQueryDto,
  ): Promise<BacktestRunEquityResponseDto> {
    try {
      const equityPoints = await this.getBacktestRunEquityUseCase.execute(
        runId,
        query,
      );
      if (!equityPoints) {
        throw new NotFoundException(`Backtest run not found: ${runId}`);
      }
      return equityPoints;
    } catch (error) {
      if (error instanceof Error && this.isClientInputError(error.message)) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private isClientInputError(message: string): boolean {
    return (
      message === 'startDate must be before or equal to endDate' ||
      message === 'fromDate must be before or equal to toDate' ||
      message === 'fromTs must be before or equal to toTs' ||
      message === 'Date range cannot be in the future' ||
      message.startsWith('Invalid timeframe:')
    );
  }
}
