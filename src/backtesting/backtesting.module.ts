import { Module } from '@nestjs/common';
import { FVG_DETECTOR_TOKEN } from './domain/interfaces/fvg-detector.interface';
import { MARKET_DATA_REPOSITORY_TOKEN } from './domain/interfaces/market-data-repository.interface';
import { STRATEGY_EVALUATOR_TOKEN } from './domain/interfaces/strategy-evaluator.interface';
import { STRUCTURE_DETECTOR_TOKEN } from './domain/interfaces/structure-detector.interface';
import { TRADE_SIMULATOR_TOKEN } from './domain/interfaces/trade-simulator.interface';
import { MarketDataMapper } from './infrastructure/mappers/market-data.mapper';
import { CandleAggregator } from './infrastructure/market-data/candle.aggregator';
import { TimeframeCacheService } from './infrastructure/market-data/timeframe-cache.service';
import { MarketDataRepository } from './infrastructure/repositories/market-data.repository';
import { FvgDetector } from './infrastructure/signal-detection/fvg.detector';
import { StrategyEvaluator } from './infrastructure/signal-detection/strategy.evaluator';
import { StructureDetector } from './infrastructure/signal-detection/structure.detector';
import { TradeSimulator } from './infrastructure/trade-simulation/trade.simulator';
import { PrismaService } from 'src/core/infrastructure/prisma.service';

@Module({
  providers: [
    PrismaService,
    MarketDataMapper,
    CandleAggregator,
    TimeframeCacheService,
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
  ],
  exports: [
    MARKET_DATA_REPOSITORY_TOKEN,
    FVG_DETECTOR_TOKEN,
    STRUCTURE_DETECTOR_TOKEN,
    STRATEGY_EVALUATOR_TOKEN,
    TRADE_SIMULATOR_TOKEN,
  ],
})
export class BacktestingModule {}
