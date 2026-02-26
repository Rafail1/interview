import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LOGGER_TOKEN } from 'src/core/interfaces/logger.interface';
import { NestLoggerService } from 'src/core/infrastructure/nest-logger.service';
import { ListActiveMarketSymbolsUseCase } from './application/use-cases/list-active-market-symbols.use-case';
import { ListTrackedSymbolsUseCase } from './application/use-cases/list-tracked-symbols.use-case';
import { ListFvgZonesUseCase } from './application/use-cases/list-fvg-zones.use-case';
import { StartSymbolTrackingUseCase } from './application/use-cases/start-symbol-tracking.use-case';
import { StopSymbolTrackingUseCase } from './application/use-cases/stop-symbol-tracking.use-case';
import { REALTIME_MARKET_ACTIVITY_TRACKER_TOKEN } from './domain/interfaces/realtime-market-activity-tracker.interface';
import { REALTIME_MARKET_DATA_CLIENT_TOKEN } from './domain/interfaces/realtime-market-data-client.interface';
import { REALTIME_SYMBOL_TRACKER_TOKEN } from './domain/interfaces/realtime-symbol-tracker.interface';
import { MarketActivityTrackerService } from './infrastructure/activity/market-activity-tracker.service';
import { BinanceRealtimeMarketDataClient } from './infrastructure/market-data/binance-realtime-market-data.client';
import { RealtimeSymbolTrackerService } from './infrastructure/tracking/realtime-symbol-tracker.service';
import { RealtimeSignalsController } from './interfaces/http/realtime-signals.controller';

@Module({
  imports: [ConfigModule],
  controllers: [RealtimeSignalsController],
  providers: [
    StartSymbolTrackingUseCase,
    StopSymbolTrackingUseCase,
    ListTrackedSymbolsUseCase,
    ListFvgZonesUseCase,
    ListActiveMarketSymbolsUseCase,
    {
      provide: LOGGER_TOKEN,
      useClass: NestLoggerService,
    },
    {
      provide: REALTIME_MARKET_DATA_CLIENT_TOKEN,
      useClass: BinanceRealtimeMarketDataClient,
    },
    {
      provide: REALTIME_SYMBOL_TRACKER_TOKEN,
      useClass: RealtimeSymbolTrackerService,
    },
    {
      provide: REALTIME_MARKET_ACTIVITY_TRACKER_TOKEN,
      useClass: MarketActivityTrackerService,
    },
  ],
  exports: [
    REALTIME_SYMBOL_TRACKER_TOKEN,
    REALTIME_MARKET_ACTIVITY_TRACKER_TOKEN,
  ],
})
export class RealtimeSignalsModule {}
