import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DOWNLOAD_MANAGER_TOKEN } from './domain/interfaces/download-manager.interface';
import { FVG_DETECTOR_TOKEN } from './domain/interfaces/fvg-detector.interface';
import { MARKET_DATA_REPOSITORY_TOKEN } from './domain/interfaces/market-data-repository.interface';
import { STRATEGY_EVALUATOR_TOKEN } from './domain/interfaces/strategy-evaluator.interface';
import { STRUCTURE_DETECTOR_TOKEN } from './domain/interfaces/structure-detector.interface';
import { TRADE_SIMULATOR_TOKEN } from './domain/interfaces/trade-simulator.interface';
import { DownloadManager } from './infrastructure/market-data/download-manager/download-manager';
import { BacktestingModule } from './backtesting.module';

describe('BacktestingModule DI', () => {
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        BacktestingModule,
      ],
    }).compile();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('resolves all backtesting tokens', () => {
    const downloadManagerByToken = moduleRef.get(DOWNLOAD_MANAGER_TOKEN);
    const downloadManagerClass = moduleRef.get(DownloadManager);
    const marketDataRepository = moduleRef.get(MARKET_DATA_REPOSITORY_TOKEN);
    const fvgDetector = moduleRef.get(FVG_DETECTOR_TOKEN);
    const structureDetector = moduleRef.get(STRUCTURE_DETECTOR_TOKEN);
    const strategyEvaluator = moduleRef.get(STRATEGY_EVALUATOR_TOKEN);
    const tradeSimulator = moduleRef.get(TRADE_SIMULATOR_TOKEN);

    expect(downloadManagerByToken).toBeDefined();
    expect(downloadManagerClass).toBeDefined();
    expect(downloadManagerByToken).toBe(downloadManagerClass);
    expect(marketDataRepository).toBeDefined();
    expect(fvgDetector).toBeDefined();
    expect(structureDetector).toBeDefined();
    expect(strategyEvaluator).toBeDefined();
    expect(tradeSimulator).toBeDefined();
  });
});
