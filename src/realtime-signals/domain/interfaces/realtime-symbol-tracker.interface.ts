export type RealtimeTrackedSymbolView = {
  symbol: string;
  activeFvgCount: number;
  startedAt: string;
};

export type RealtimeFvgZoneView = {
  symbol: string;
  id: string;
  direction: 'bullish' | 'bearish';
  upperBound: string;
  lowerBound: string;
  startTime: string;
  endTime: string | null;
  mitigated: boolean;
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
  listFvgZones(symbol?: string): RealtimeFvgZoneView[];
}

export const REALTIME_SYMBOL_TRACKER_TOKEN = Symbol('IRealtimeSymbolTracker');
