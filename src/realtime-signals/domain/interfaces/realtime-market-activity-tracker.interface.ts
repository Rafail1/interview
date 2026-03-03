export type RealtimeActiveSymbolView = {
  symbol: string;
  tradesPerSecond: number;
  lastActiveAt: string;
};

export type RealtimeMarketActivityStartView = {
  started: boolean;
  symbolsTracked: number;
};

export type RealtimeMarketActivityStatusView = {
  started: boolean;
  starting: boolean;
  trackedSymbols: number;
  activeSymbols: number;
  sockets: number;
};

export interface IRealtimeMarketActivityTracker {
  start(): Promise<RealtimeMarketActivityStartView>;
  getStatus(): RealtimeMarketActivityStatusView;
  getActiveSymbols(): RealtimeActiveSymbolView[];
}

export const REALTIME_MARKET_ACTIVITY_TRACKER_TOKEN = Symbol(
  'IRealtimeMarketActivityTracker',
);
