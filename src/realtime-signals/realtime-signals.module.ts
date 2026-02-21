import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LOGGER_TOKEN } from 'src/core/interfaces/logger.interface';
import { NestLoggerService } from 'src/core/infrastructure/nest-logger.service';
import { ListTrackedSymbolsUseCase } from './application/use-cases/list-tracked-symbols.use-case';
import { StartSymbolTrackingUseCase } from './application/use-cases/start-symbol-tracking.use-case';
import { StopSymbolTrackingUseCase } from './application/use-cases/stop-symbol-tracking.use-case';
import { REALTIME_MARKET_DATA_CLIENT_TOKEN } from './domain/interfaces/realtime-market-data-client.interface';
import { REALTIME_SYMBOL_TRACKER_TOKEN } from './domain/interfaces/realtime-symbol-tracker.interface';
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
  ],
  exports: [REALTIME_SYMBOL_TRACKER_TOKEN],
})
export class RealtimeSignalsModule {}

