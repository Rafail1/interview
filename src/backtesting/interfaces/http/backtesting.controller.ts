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
import { StartCandleIngestionJobUseCase } from 'src/backtesting/application/use-cases/start-candle-ingestion-job.use-case';
import { StartCandleIngestionRunnerUseCase } from 'src/backtesting/application/use-cases/start-candle-ingestion-runner.use-case';
import { GetCandleIngestionRunnerStatusUseCase } from 'src/backtesting/application/use-cases/get-candle-ingestion-runner-status.use-case';
import { StartInPlayRunUseCase } from 'src/backtesting/application/use-cases/start-in-play-run.use-case';
import { GetInPlayRunStatusUseCase } from 'src/backtesting/application/use-cases/get-in-play-run-status.use-case';
import { ListInPlayRunsUseCase } from 'src/backtesting/application/use-cases/list-in-play-runs.use-case';
import { ListInPlayRangesUseCase } from 'src/backtesting/application/use-cases/list-in-play-ranges.use-case';
import { ListInPlayFvgZonesUseCase } from 'src/backtesting/application/use-cases/list-in-play-fvg-zones.use-case';
import { GenerateInPlayEntryWindowsUseCase } from 'src/backtesting/application/use-cases/generate-in-play-entry-windows.use-case';
import { ListInPlayEntryWindowsUseCase } from 'src/backtesting/application/use-cases/list-in-play-entry-windows.use-case';
import { RunInPlayBacktestUseCase } from 'src/backtesting/application/use-cases/run-in-play-backtest.use-case';
import { GetCandleIngestionJobStatusUseCase } from 'src/backtesting/application/use-cases/get-candle-ingestion-job-status.use-case';
import { GetCandleIngestionJobDetailsUseCase } from 'src/backtesting/application/use-cases/get-candle-ingestion-job-details.use-case';
import { GetCandleIngestionJobSymbolRunsUseCase } from 'src/backtesting/application/use-cases/get-candle-ingestion-job-symbol-runs.use-case';
import { CancelCandleIngestionJobUseCase } from 'src/backtesting/application/use-cases/cancel-candle-ingestion-job.use-case';
import { ListCandleIngestionJobsUseCase } from 'src/backtesting/application/use-cases/list-candle-ingestion-jobs.use-case';
import { GetBacktestRunUseCase } from 'src/backtesting/application/use-cases/get-backtest-run.use-case';
import { CancelBacktestRunUseCase } from 'src/backtesting/application/use-cases/cancel-backtest-run.use-case';
import { GetBacktestRunProgressUseCase } from 'src/backtesting/application/use-cases/get-backtest-run-progress.use-case';
import { GetBacktestRunSummaryUseCase } from 'src/backtesting/application/use-cases/get-backtest-run-summary.use-case';
import { GetBacktestRunSignalsUseCase } from 'src/backtesting/application/use-cases/get-backtest-run-signals.use-case';
import { GetBacktestRunEquityUseCase } from 'src/backtesting/application/use-cases/get-backtest-run-equity.use-case';
import { GetBacktestRunFvgZonesUseCase } from 'src/backtesting/application/use-cases/get-backtest-run-fvg-zones.use-case';
import { ListBacktestRunsUseCase } from 'src/backtesting/application/use-cases/list-backtest-runs.use-case';
import { ListActiveBacktestRunsUseCase } from 'src/backtesting/application/use-cases/list-active-backtest-runs.use-case';
import { RunBacktestUseCase } from 'src/backtesting/application/use-cases/run-backtest.use-case';
import { CandleIngestionJobDetailsView } from 'src/backtesting/domain/interfaces/candle-ingestion-job-repository.interface';
import { BacktestRunEquityResponseDto } from '../dtos/backtest-run-equity-response.dto';
import { BacktestRunFvgZonesResponseDto } from '../dtos/backtest-run-fvg-zones-response.dto';
import { BacktestingHealthResponseDto } from '../dtos/backtesting-health-response.dto';
import { BacktestRunResponseDto } from '../dtos/backtest-run-response.dto';
import { BacktestRunProgressResponseDto } from '../dtos/backtest-run-progress-response.dto';
import { BacktestRunSummaryResponseDto } from '../dtos/backtest-run-summary-response.dto';
import { BacktestRunSeriesQueryDto } from '../dtos/backtest-run-series-query.dto';
import { BacktestRunSignalsResponseDto } from '../dtos/backtest-run-signals-response.dto';
import { CancelBacktestRunResponseDto } from '../dtos/cancel-backtest-run-response.dto';
import { CancelCandleIngestionJobResponseDto } from '../dtos/cancel-candle-ingestion-job-response.dto';
import { CandleIngestionJobStatusResponseDto } from '../dtos/candle-ingestion-job-status-response.dto';
import { CandleIngestionJobDetailsResponseDto } from '../dtos/candle-ingestion-job-details-response.dto';
import { CandleIngestionJobSymbolRunsResponseDto } from '../dtos/candle-ingestion-job-symbol-runs-response.dto';
import { ImportBinanceDataRequestDto } from '../dtos/import-binance-data-request.dto';
import { ImportBinanceDataResponseDto } from '../dtos/import-binance-data-response.dto';
import { ImportJobStatusResponseDto } from '../dtos/import-job-status-response.dto';
import { ImportQueueOverviewResponseDto } from '../dtos/import-queue-overview-response.dto';
import { ListBacktestRunsQueryDto } from '../dtos/list-backtest-runs-query.dto';
import { ListBacktestRunsResponseDto } from '../dtos/list-backtest-runs-response.dto';
import { ListActiveBacktestRunsResponseDto } from '../dtos/list-active-backtest-runs-response.dto';
import { ListCandleIngestionJobsQueryDto } from '../dtos/list-candle-ingestion-jobs-query.dto';
import { ListCandleIngestionJobsResponseDto } from '../dtos/list-candle-ingestion-jobs-response.dto';
import { RunBacktestRequestDto } from '../dtos/run-backtest-request.dto';
import { RunBacktestResponseDto } from '../dtos/run-backtest-response.dto';
import { StartCandleIngestionJobRequestDto } from '../dtos/start-candle-ingestion-job-request.dto';
import { StartCandleIngestionJobResponseDto } from '../dtos/start-candle-ingestion-job-response.dto';
import { StartCandleIngestionRunnerResponseDto } from '../dtos/start-candle-ingestion-runner-response.dto';
import { CandleIngestionRunnerStatusResponseDto } from '../dtos/candle-ingestion-runner-status-response.dto';
import { StartInPlayRunRequestDto } from '../dtos/start-in-play-run-request.dto';
import { StartInPlayRunResponseDto } from '../dtos/start-in-play-run-response.dto';
import { InPlayRunStatusResponseDto } from '../dtos/in-play-run-status-response.dto';
import { ListInPlayRunsQueryDto } from '../dtos/list-in-play-runs-query.dto';
import { ListInPlayRunsResponseDto } from '../dtos/list-in-play-runs-response.dto';
import { ListInPlayRangesQueryDto } from '../dtos/list-in-play-ranges-query.dto';
import { ListInPlayRangesResponseDto } from '../dtos/list-in-play-ranges-response.dto';
import { ListInPlayFvgZonesQueryDto } from '../dtos/list-in-play-fvg-zones-query.dto';
import { ListInPlayFvgZonesResponseDto } from '../dtos/list-in-play-fvg-zones-response.dto';
import { GenerateInPlayEntryWindowsRequestDto } from '../dtos/generate-in-play-entry-windows-request.dto';
import { GenerateInPlayEntryWindowsResponseDto } from '../dtos/generate-in-play-entry-windows-response.dto';
import { ListInPlayEntryWindowsQueryDto } from '../dtos/list-in-play-entry-windows-query.dto';
import { ListInPlayEntryWindowsResponseDto } from '../dtos/list-in-play-entry-windows-response.dto';
import { RunInPlayBacktestRequestDto } from '../dtos/run-in-play-backtest-request.dto';
import { RunInPlayBacktestResponseDto } from '../dtos/run-in-play-backtest-response.dto';

@ApiTags('backtesting')
@Controller('backtesting')
export class BacktestingController {
  constructor(
    private readonly importBinanceDataUseCase: ImportBinanceDataUseCase,
    private readonly startCandleIngestionJobUseCase: StartCandleIngestionJobUseCase,
    private readonly startCandleIngestionRunnerUseCase: StartCandleIngestionRunnerUseCase,
    private readonly getCandleIngestionRunnerStatusUseCase: GetCandleIngestionRunnerStatusUseCase,
    private readonly startInPlayRunUseCase: StartInPlayRunUseCase,
    private readonly getInPlayRunStatusUseCase: GetInPlayRunStatusUseCase,
    private readonly listInPlayRunsUseCase: ListInPlayRunsUseCase,
    private readonly listInPlayRangesUseCase: ListInPlayRangesUseCase,
    private readonly listInPlayFvgZonesUseCase: ListInPlayFvgZonesUseCase,
    private readonly generateInPlayEntryWindowsUseCase: GenerateInPlayEntryWindowsUseCase,
    private readonly listInPlayEntryWindowsUseCase: ListInPlayEntryWindowsUseCase,
    private readonly runInPlayBacktestUseCase: RunInPlayBacktestUseCase,
    private readonly getCandleIngestionJobStatusUseCase: GetCandleIngestionJobStatusUseCase,
    private readonly getCandleIngestionJobDetailsUseCase: GetCandleIngestionJobDetailsUseCase,
    private readonly getCandleIngestionJobSymbolRunsUseCase: GetCandleIngestionJobSymbolRunsUseCase,
    private readonly cancelCandleIngestionJobUseCase: CancelCandleIngestionJobUseCase,
    private readonly listCandleIngestionJobsUseCase: ListCandleIngestionJobsUseCase,
    private readonly getImportJobStatusUseCase: GetImportJobStatusUseCase,
    private readonly getImportQueueOverviewUseCase: GetImportQueueOverviewUseCase,
    private readonly runBacktestUseCase: RunBacktestUseCase,
    private readonly cancelBacktestRunUseCase: CancelBacktestRunUseCase,
    private readonly getBacktestRunUseCase: GetBacktestRunUseCase,
    private readonly getBacktestRunProgressUseCase: GetBacktestRunProgressUseCase,
    private readonly getBacktestRunSummaryUseCase: GetBacktestRunSummaryUseCase,
    private readonly getBacktestRunSignalsUseCase: GetBacktestRunSignalsUseCase,
    private readonly getBacktestRunEquityUseCase: GetBacktestRunEquityUseCase,
    private readonly getBacktestRunFvgZonesUseCase: GetBacktestRunFvgZonesUseCase,
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

  @Post('ingestion/jobs')
  @ApiOperation({ summary: 'Start asynchronous candle ingestion job' })
  @ApiCreatedResponse({ type: StartCandleIngestionJobResponseDto })
  public async startCandleIngestionJob(
    @Body() body: StartCandleIngestionJobRequestDto,
  ): Promise<StartCandleIngestionJobResponseDto> {
    try {
      return await this.startCandleIngestionJobUseCase.execute(body);
    } catch (error) {
      if (error instanceof Error && this.isClientInputError(error.message)) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Post('ingestion/runner/start')
  @ApiOperation({ summary: 'Start ingestion runner and resume pending/running jobs' })
  @ApiOkResponse({ type: StartCandleIngestionRunnerResponseDto })
  public async startCandleIngestionRunner(): Promise<StartCandleIngestionRunnerResponseDto> {
    return this.startCandleIngestionRunnerUseCase.execute();
  }

  @Post('in-play/runs')
  @ApiOperation({ summary: 'Start in-play range detection run' })
  @ApiCreatedResponse({ type: StartInPlayRunResponseDto })
  public async startInPlayRun(
    @Body() body: StartInPlayRunRequestDto,
  ): Promise<StartInPlayRunResponseDto> {
    try {
      return await this.startInPlayRunUseCase.execute(body);
    } catch (error) {
      if (error instanceof Error && this.isClientInputError(error.message)) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get('in-play/runs')
  @ApiOperation({ summary: 'List in-play runs' })
  @ApiOkResponse({ type: ListInPlayRunsResponseDto })
  public async listInPlayRuns(
    @Query() query: ListInPlayRunsQueryDto,
  ): Promise<ListInPlayRunsResponseDto> {
    return this.listInPlayRunsUseCase.execute(query);
  }

  @Get('in-play/runs/:runId')
  @ApiOperation({ summary: 'Get in-play run status' })
  @ApiOkResponse({ type: InPlayRunStatusResponseDto })
  @ApiNotFoundResponse({ description: 'In-play run not found' })
  public async getInPlayRunStatus(
    @Param('runId') runId: string,
  ): Promise<InPlayRunStatusResponseDto> {
    const run = await this.getInPlayRunStatusUseCase.execute(runId);
    if (!run) {
      throw new NotFoundException(`In-play run not found: ${runId}`);
    }
    return run;
  }

  @Get('in-play/runs/:runId/ranges')
  @ApiOperation({ summary: 'List detected in-play ranges' })
  @ApiOkResponse({ type: ListInPlayRangesResponseDto })
  @ApiNotFoundResponse({ description: 'In-play run not found' })
  public async listInPlayRanges(
    @Param('runId') runId: string,
    @Query() query: ListInPlayRangesQueryDto,
  ): Promise<ListInPlayRangesResponseDto> {
    const response = await this.listInPlayRangesUseCase.execute(runId, query);
    if (!response) {
      throw new NotFoundException(`In-play run not found: ${runId}`);
    }
    return response;
  }

  @Get('in-play/runs/:runId/fvg-zones')
  @ApiOperation({ summary: 'List 15m FVG zones reconstructed for in-play ranges' })
  @ApiOkResponse({ type: ListInPlayFvgZonesResponseDto })
  @ApiNotFoundResponse({ description: 'In-play run not found' })
  public async listInPlayFvgZones(
    @Param('runId') runId: string,
    @Query() query: ListInPlayFvgZonesQueryDto,
  ): Promise<ListInPlayFvgZonesResponseDto> {
    const response = await this.listInPlayFvgZonesUseCase.execute(runId, query);
    if (!response) {
      throw new NotFoundException(`In-play run not found: ${runId}`);
    }
    return response;
  }

  @Post('in-play/runs/:runId/entry-windows/generate')
  @ApiOperation({
    summary:
      'Generate and persist 1m entry windows from mitigated 15m FVG zones in in-play ranges',
  })
  @ApiCreatedResponse({ type: GenerateInPlayEntryWindowsResponseDto })
  @ApiNotFoundResponse({ description: 'In-play run not found' })
  public async generateInPlayEntryWindows(
    @Param('runId') runId: string,
    @Body() body: GenerateInPlayEntryWindowsRequestDto,
  ): Promise<GenerateInPlayEntryWindowsResponseDto> {
    const response = await this.generateInPlayEntryWindowsUseCase.execute(
      runId,
      body,
    );
    if (!response) {
      throw new NotFoundException(`In-play run not found: ${runId}`);
    }
    return response;
  }

  @Get('in-play/runs/:runId/entry-windows')
  @ApiOperation({ summary: 'List persisted 1m entry windows for in-play run' })
  @ApiOkResponse({ type: ListInPlayEntryWindowsResponseDto })
  @ApiNotFoundResponse({ description: 'In-play run not found' })
  public async listInPlayEntryWindows(
    @Param('runId') runId: string,
    @Query() query: ListInPlayEntryWindowsQueryDto,
  ): Promise<ListInPlayEntryWindowsResponseDto> {
    const response = await this.listInPlayEntryWindowsUseCase.execute(runId, query);
    if (!response) {
      throw new NotFoundException(`In-play run not found: ${runId}`);
    }
    return response;
  }

  @Post('in-play/runs/:runId/backtest')
  @ApiOperation({ summary: 'Run lightweight backtest on persisted in-play entry windows' })
  @ApiOkResponse({ type: RunInPlayBacktestResponseDto })
  @ApiNotFoundResponse({ description: 'In-play run not found' })
  public async runInPlayBacktest(
    @Param('runId') runId: string,
    @Body() body: RunInPlayBacktestRequestDto,
  ): Promise<RunInPlayBacktestResponseDto> {
    try {
      const response = await this.runInPlayBacktestUseCase.execute(runId, body);
      if (!response) {
        throw new NotFoundException(`In-play run not found: ${runId}`);
      }
      return response;
    } catch (error) {
      if (error instanceof Error && this.isClientInputError(error.message)) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get('ingestion/runner/status')
  @ApiOperation({ summary: 'Get ingestion runner runtime status' })
  @ApiOkResponse({ type: CandleIngestionRunnerStatusResponseDto })
  public getCandleIngestionRunnerStatus(): CandleIngestionRunnerStatusResponseDto {
    return this.getCandleIngestionRunnerStatusUseCase.execute();
  }

  @Get('ingestion/jobs')
  @ApiOperation({ summary: 'List candle ingestion jobs' })
  @ApiOkResponse({ type: ListCandleIngestionJobsResponseDto })
  public async listCandleIngestionJobs(
    @Query() query: ListCandleIngestionJobsQueryDto,
  ): Promise<ListCandleIngestionJobsResponseDto> {
    try {
      return await this.listCandleIngestionJobsUseCase.execute(query);
    } catch (error) {
      if (error instanceof Error && this.isClientInputError(error.message)) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get('ingestion/jobs/:jobId')
  @ApiOperation({ summary: 'Get candle ingestion job status' })
  @ApiOkResponse({ type: CandleIngestionJobStatusResponseDto })
  @ApiNotFoundResponse({ description: 'Candle ingestion job not found' })
  public async getCandleIngestionJobStatus(
    @Param('jobId') jobId: string,
  ): Promise<CandleIngestionJobStatusResponseDto> {
    const job = await this.getCandleIngestionJobStatusUseCase.execute(jobId);
    if (!job) {
      throw new NotFoundException(`Candle ingestion job not found: ${jobId}`);
    }
    return job;
  }

  @Get('ingestion/jobs/:jobId/details')
  @ApiOperation({ summary: 'Get candle ingestion job details with symbol-run stats' })
  @ApiOkResponse({ type: CandleIngestionJobDetailsResponseDto })
  @ApiNotFoundResponse({ description: 'Candle ingestion job not found' })
  public async getCandleIngestionJobDetails(
    @Param('jobId') jobId: string,
  ): Promise<CandleIngestionJobDetailsResponseDto> {
    const details = await this.getCandleIngestionJobDetailsUseCase.execute(jobId);
    if (!details) {
      throw new NotFoundException(`Candle ingestion job not found: ${jobId}`);
    }
    return {
      ...details,
      progressPercent: this.calculateIngestionProgressPercent(details),
      eta: this.calculateIngestionEta(details),
    };
  }

  @Get('ingestion/jobs/:jobId/symbols')
  @ApiOperation({ summary: 'Get symbol runs for candle ingestion job' })
  @ApiOkResponse({ type: CandleIngestionJobSymbolRunsResponseDto })
  @ApiNotFoundResponse({ description: 'Candle ingestion job not found' })
  public async getCandleIngestionJobSymbolRuns(
    @Param('jobId') jobId: string,
  ): Promise<CandleIngestionJobSymbolRunsResponseDto> {
    const runs = await this.getCandleIngestionJobSymbolRunsUseCase.execute(jobId);
    if (!runs) {
      throw new NotFoundException(`Candle ingestion job not found: ${jobId}`);
    }
    return {
      jobId,
      runs,
    };
  }

  @Post('ingestion/jobs/:jobId/cancel')
  @ApiOperation({ summary: 'Request cancellation of a running ingestion job' })
  @ApiOkResponse({ type: CancelCandleIngestionJobResponseDto })
  @ApiNotFoundResponse({ description: 'Candle ingestion job not found' })
  public async cancelCandleIngestionJob(
    @Param('jobId') jobId: string,
  ): Promise<CancelCandleIngestionJobResponseDto> {
    const result = await this.cancelCandleIngestionJobUseCase.execute(jobId);
    if (!result) {
      throw new NotFoundException(`Candle ingestion job not found: ${jobId}`);
    }
    return result;
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

  @Get('run/:runId/fvg-zones')
  @ApiOperation({
    summary: 'Get reconstructed FVG zones with mitigation and execution reason',
  })
  @ApiOkResponse({ type: BacktestRunFvgZonesResponseDto })
  @ApiNotFoundResponse({ description: 'Backtest run not found' })
  public async getBacktestRunFvgZones(
    @Param('runId') runId: string,
  ): Promise<BacktestRunFvgZonesResponseDto> {
    const zones = await this.getBacktestRunFvgZonesUseCase.execute(runId);
    if (!zones) {
      throw new NotFoundException(`Backtest run not found: ${runId}`);
    }
    return zones;
  }

  private isClientInputError(message: string): boolean {
    return (
      message === 'startDate must be before or equal to endDate' ||
      message === 'Invalid date range' ||
      message === 'quoteVolumeThreshold must be non-negative' ||
      message === 'volatilityThreshold must be non-negative' ||
      message === 'fromDate must be before or equal to toDate' ||
      message === 'fromTs must be before or equal to toTs' ||
      message === 'Date range cannot be in the future' ||
      message.startsWith('Invalid timeframe:')
    );
  }

  private calculateIngestionProgressPercent(
    details: CandleIngestionJobDetailsView,
  ): number {
    const total = details.symbolRunStats.total;
    const done =
      details.symbolRunStats.completed +
      details.symbolRunStats.failed +
      details.symbolRunStats.skipped;

    if (total <= 0) {
      return details.job.status === 'completed' ||
        details.job.status === 'completed_with_errors' ||
        details.job.status === 'cancelled'
        ? 100
        : 0;
    }

    const value = (done / total) * 100;
    return Number(Math.min(100, Math.max(0, value)).toFixed(2));
  }

  private calculateIngestionEta(
    details: CandleIngestionJobDetailsView,
  ): Date | null {
    if (details.job.status !== 'running') {
      return null;
    }
    if (!details.job.startedAt) {
      return null;
    }

    const total = details.symbolRunStats.total;
    const done =
      details.symbolRunStats.completed +
      details.symbolRunStats.failed +
      details.symbolRunStats.skipped;
    const remaining = total - done;

    if (total <= 0 || done <= 0 || remaining <= 0) {
      return null;
    }

    const nowMs = Date.now();
    const startedAtMs = details.job.startedAt.getTime();
    const elapsedMs = nowMs - startedAtMs;
    if (elapsedMs <= 0) {
      return null;
    }

    const symbolsPerMs = done / elapsedMs;
    if (symbolsPerMs <= 0) {
      return null;
    }

    const etaMs = nowMs + remaining / symbolsPerMs;
    if (!Number.isFinite(etaMs)) {
      return null;
    }
    return new Date(Math.round(etaMs));
  }
}
