import { Module } from '@nestjs/common';
import { GetImportJobStatusUseCase } from './application/use-cases/get-import-job-status.use-case';
import { GetImportQueueOverviewUseCase } from './application/use-cases/get-import-queue-overview.use-case';
import { ImportBinanceDataUseCase } from './application/use-cases/import-binance-data.use-case';
import { StartCandleIngestionJobUseCase } from './application/use-cases/start-candle-ingestion-job.use-case';
import { StartCandleIngestionRunnerUseCase } from './application/use-cases/start-candle-ingestion-runner.use-case';
import { GetCandleIngestionRunnerStatusUseCase } from './application/use-cases/get-candle-ingestion-runner-status.use-case';
import { StartInPlayRunUseCase } from './application/use-cases/start-in-play-run.use-case';
import { GetInPlayRunStatusUseCase } from './application/use-cases/get-in-play-run-status.use-case';
import { ListInPlayRangesUseCase } from './application/use-cases/list-in-play-ranges.use-case';
import { ListInPlayFvgZonesUseCase } from './application/use-cases/list-in-play-fvg-zones.use-case';
import { GetCandleIngestionJobStatusUseCase } from './application/use-cases/get-candle-ingestion-job-status.use-case';
import { GetCandleIngestionJobDetailsUseCase } from './application/use-cases/get-candle-ingestion-job-details.use-case';
import { GetCandleIngestionJobSymbolRunsUseCase } from './application/use-cases/get-candle-ingestion-job-symbol-runs.use-case';
import { CancelCandleIngestionJobUseCase } from './application/use-cases/cancel-candle-ingestion-job.use-case';
import { ListCandleIngestionJobsUseCase } from './application/use-cases/list-candle-ingestion-jobs.use-case';
import { GetBacktestRunUseCase } from './application/use-cases/get-backtest-run.use-case';
import { CancelBacktestRunUseCase } from './application/use-cases/cancel-backtest-run.use-case';
import { GetBacktestRunProgressUseCase } from './application/use-cases/get-backtest-run-progress.use-case';
import { GetBacktestRunSummaryUseCase } from './application/use-cases/get-backtest-run-summary.use-case';
import { GetBacktestRunSignalsUseCase } from './application/use-cases/get-backtest-run-signals.use-case';
import { GetBacktestRunEquityUseCase } from './application/use-cases/get-backtest-run-equity.use-case';
import { GetBacktestRunFvgZonesUseCase } from './application/use-cases/get-backtest-run-fvg-zones.use-case';
import { ListActiveBacktestRunsUseCase } from './application/use-cases/list-active-backtest-runs.use-case';
import { ListBacktestRunsUseCase } from './application/use-cases/list-backtest-runs.use-case';
import { RunBacktestUseCase } from './application/use-cases/run-backtest.use-case';
import { DOWNLOAD_MANAGER_TOKEN } from './domain/interfaces/download-manager.interface';
import { CANDLE_INGESTION_JOB_REPOSITORY_TOKEN } from './domain/interfaces/candle-ingestion-job-repository.interface';
import { CANDLE_INGESTION_RUNNER_TOKEN } from './domain/interfaces/candle-ingestion-runner.interface';
import { FVG_DETECTOR_TOKEN } from './domain/interfaces/fvg-detector.interface';
import { MARKET_DATA_REPOSITORY_TOKEN } from './domain/interfaces/market-data-repository.interface';
import { STRATEGY_EVALUATOR_TOKEN } from './domain/interfaces/strategy-evaluator.interface';
import { STRUCTURE_DETECTOR_TOKEN } from './domain/interfaces/structure-detector.interface';
import { TRADE_SIMULATOR_TOKEN } from './domain/interfaces/trade-simulator.interface';
import { BACKTEST_RUN_REPOSITORY_TOKEN } from './domain/interfaces/backtest-run-repository.interface';
import { IN_PLAY_RUN_REPOSITORY_TOKEN } from './domain/interfaces/in-play-run-repository.interface';
import { IN_PLAY_RUNNER_TOKEN } from './domain/interfaces/in-play-runner.interface';
import { BacktestingController } from './interfaces/http/backtesting.controller';
import { BinanceDataDownloader } from './infrastructure/data-loaders/binance-data.downloader';
import { MarketDataMapper } from './infrastructure/mappers/market-data.mapper';
import { BacktestRunMapper } from './infrastructure/mappers/backtest-run.mapper';
import { CandleAggregator } from './infrastructure/market-data/candle.aggregator';
import { DownloadJobRepository } from './infrastructure/market-data/download-manager/download-job.repository';
import { DownloadManager } from './infrastructure/market-data/download-manager/download-manager';
import { TimeframeCacheService } from './infrastructure/market-data/timeframe-cache.service';
import { MarketDataRepository } from './infrastructure/repositories/market-data.repository';
import { BacktestRunRepository } from './infrastructure/repositories/backtest-run.repository';
import { CandleIngestionJobRepository } from './infrastructure/repositories/candle-ingestion-job.repository';
import { InPlayRunRepository } from './infrastructure/repositories/in-play-run.repository';
import { CandleIngestionRunnerService } from './infrastructure/ingestion/candle-ingestion-runner.service';
import { InPlayRunnerService } from './infrastructure/in-play/in-play-runner.service';
import { FvgDetector } from './infrastructure/signal-detection/fvg.detector';
import { StrategyEvaluator } from './infrastructure/signal-detection/strategy.evaluator';
import { StructureDetector } from './infrastructure/signal-detection/structure.detector';
import { TradeSimulator } from './infrastructure/trade-simulation/trade.simulator';
import { NestLoggerService } from 'src/core/infrastructure/nest-logger.service';
import { PrismaService } from 'src/core/infrastructure/prisma.service';
import { LOGGER_TOKEN } from 'src/core/interfaces/logger.interface';

@Module({
  controllers: [BacktestingController],
  providers: [
    PrismaService,
    ImportBinanceDataUseCase,
    StartCandleIngestionJobUseCase,
    StartCandleIngestionRunnerUseCase,
    GetCandleIngestionRunnerStatusUseCase,
    StartInPlayRunUseCase,
    GetInPlayRunStatusUseCase,
    ListInPlayRangesUseCase,
    ListInPlayFvgZonesUseCase,
    GetCandleIngestionJobStatusUseCase,
    GetCandleIngestionJobDetailsUseCase,
    GetCandleIngestionJobSymbolRunsUseCase,
    CancelCandleIngestionJobUseCase,
    ListCandleIngestionJobsUseCase,
    GetImportJobStatusUseCase,
    GetImportQueueOverviewUseCase,
    GetBacktestRunUseCase,
    GetBacktestRunProgressUseCase,
    CancelBacktestRunUseCase,
    GetBacktestRunSummaryUseCase,
    GetBacktestRunSignalsUseCase,
    GetBacktestRunEquityUseCase,
    GetBacktestRunFvgZonesUseCase,
    ListActiveBacktestRunsUseCase,
    ListBacktestRunsUseCase,
    RunBacktestUseCase,
    BacktestRunMapper,
    MarketDataMapper,
    CandleAggregator,
    TimeframeCacheService,
    BinanceDataDownloader,
    DownloadJobRepository,
    DownloadManager,
    CandleIngestionRunnerService,
    InPlayRunnerService,
    {
      provide: CANDLE_INGESTION_JOB_REPOSITORY_TOKEN,
      useClass: CandleIngestionJobRepository,
    },
    {
      provide: CANDLE_INGESTION_RUNNER_TOKEN,
      useExisting: CandleIngestionRunnerService,
    },
    {
      provide: IN_PLAY_RUN_REPOSITORY_TOKEN,
      useClass: InPlayRunRepository,
    },
    {
      provide: IN_PLAY_RUNNER_TOKEN,
      useExisting: InPlayRunnerService,
    },
    {
      provide: LOGGER_TOKEN,
      useClass: NestLoggerService,
    },
    {
      provide: MARKET_DATA_REPOSITORY_TOKEN,
      useClass: MarketDataRepository,
    },
    {
      provide: FVG_DETECTOR_TOKEN,
      useClass: FvgDetector,
    },
    {
      provide: STRUCTURE_DETECTOR_TOKEN,
      useClass: StructureDetector,
    },
    {
      provide: STRATEGY_EVALUATOR_TOKEN,
      useClass: StrategyEvaluator,
    },
    {
      provide: TRADE_SIMULATOR_TOKEN,
      useClass: TradeSimulator,
    },
    {
      provide: BACKTEST_RUN_REPOSITORY_TOKEN,
      useClass: BacktestRunRepository,
    },
    {
      provide: DOWNLOAD_MANAGER_TOKEN,
      useExisting: DownloadManager,
    },
  ],
  exports: [
    MARKET_DATA_REPOSITORY_TOKEN,
    FVG_DETECTOR_TOKEN,
    STRUCTURE_DETECTOR_TOKEN,
    STRATEGY_EVALUATOR_TOKEN,
    TRADE_SIMULATOR_TOKEN,
    DOWNLOAD_MANAGER_TOKEN,
  ],
})
export class BacktestingModule {}
