export type RealtimeActiveSymbolView = {
  symbol: string;
  tradesPerSecond: number;
  lastActiveAt: string;
};

export interface IRealtimeMarketActivityTracker {
  getActiveSymbols(): RealtimeActiveSymbolView[];
}

export const REALTIME_MARKET_ACTIVITY_TRACKER_TOKEN = Symbol(
  'IRealtimeMarketActivityTracker',
);
