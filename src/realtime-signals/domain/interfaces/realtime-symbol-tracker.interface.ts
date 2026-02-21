export type RealtimeTrackedSymbolView = {
  symbol: string;
  activeFvgCount: number;
  startedAt: string;
};

export type TrackSymbolsResult = {
  started: string[];
  alreadyTracking: string[];
  tracked: RealtimeTrackedSymbolView[];
};

export type UntrackSymbolResult = {
  symbol: string;
  stopped: boolean;
  tracked: RealtimeTrackedSymbolView[];
};

export interface IRealtimeSymbolTracker {
  startTracking(symbols: string[]): Promise<TrackSymbolsResult>;
  stopTracking(symbol: string): UntrackSymbolResult;
  getTrackedSymbols(): RealtimeTrackedSymbolView[];
}

export const REALTIME_SYMBOL_TRACKER_TOKEN = Symbol('IRealtimeSymbolTracker');

