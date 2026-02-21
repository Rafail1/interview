import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import { TimeframeValue } from 'src/backtesting/domain/value-objects/timeframe.value-object';

export interface IRealtimeMarketDataClient {
  getRecentCandles(
    symbol: string,
    timeframe: TimeframeValue,
    limit: number,
  ): Promise<Candle[]>;
}

export const REALTIME_MARKET_DATA_CLIENT_TOKEN = Symbol(
  'IRealtimeMarketDataClient',
);

