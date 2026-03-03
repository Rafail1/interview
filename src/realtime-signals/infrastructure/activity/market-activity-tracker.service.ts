import {
  Inject,
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  IRealtimeMarketActivityTracker,
  RealtimeMarketActivityStatusView,
  RealtimeActiveSymbolView,
} from 'src/realtime-signals/domain/interfaces/realtime-market-activity-tracker.interface';
import {
  type ILogger,
  LOGGER_TOKEN,
} from 'src/core/interfaces/logger.interface';

type ExchangeInfoResponse = {
  symbols: Array<{
    symbol: string;
    status: string;
    quoteAsset: string;
  }>;
};

type AggTradeEvent = {
  s: string;
};

type WebSocketLike = {
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: (() => void) | null;
  onclose: (() => void) | null;
  close: () => void;
};

type SymbolActivityState = {
  windowStartMs: number | null;
  windowTradeCount: number;
  avgTradesPerSec: number | null;
  lastActiveAtMs: number | null;
};

@Injectable()
export class MarketActivityTrackerService
  implements IRealtimeMarketActivityTracker, OnModuleDestroy
{
  private static readonly LOG_CONTEXT = 'MarketActivityTrackerService';
  private static readonly DEFAULT_TPS_THRESHOLD = 50;
  private static readonly DEFAULT_RECONCILE_MS = 1_000;
  private static readonly DEFAULT_ACTIVITY_WINDOW_MS = 3_000;
  private static readonly DEFAULT_ACTIVE_TTL_MS = 5 * 60 * 1000;
  private static readonly DEFAULT_EMA_ALPHA = 0.2;
  private static readonly STREAMS_PER_SOCKET = 200;

  private readonly http: AxiosInstance;
  private readonly tpsThreshold: number;
  private readonly reconcileMs: number;
  private readonly activityWindowMs: number;
  private readonly activeTtlMs: number;
  private readonly emaAlpha: number;

  private readonly symbolStates = new Map<string, SymbolActivityState>();
  private readonly activeSymbols = new Map<
    string,
    { tradesPerSecond: number; lastActiveAt: Date }
  >();
  private readonly trackedSymbols = new Set<string>();
  private sockets: WebSocketLike[] = [];
  private reconcileTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isBootstrapped = false;
  private isStarting = false;

  constructor(
    private readonly configService: ConfigService,
    @Inject(LOGGER_TOKEN)
    private readonly logger: ILogger,
  ) {
    this.http = axios.create({
      baseURL: 'https://fapi.binance.com',
      timeout: 20_000,
    });

    const threshold = Number(
      this.configService.get<string>('REALTIME_ACTIVE_SYMBOLS_TPS_THRESHOLD') ??
        String(MarketActivityTrackerService.DEFAULT_TPS_THRESHOLD),
    );
    this.tpsThreshold =
      Number.isFinite(threshold) && threshold > 0
        ? Math.floor(threshold)
        : MarketActivityTrackerService.DEFAULT_TPS_THRESHOLD;

    const reconcile = Number(
      this.configService.get<string>('REALTIME_ACTIVE_SYMBOLS_RECONCILE_MS') ??
        String(MarketActivityTrackerService.DEFAULT_RECONCILE_MS),
    );
    this.reconcileMs =
      Number.isFinite(reconcile) && reconcile > 0
        ? Math.floor(reconcile)
        : MarketActivityTrackerService.DEFAULT_RECONCILE_MS;

    const activityWindow = Number(
      this.configService.get<string>('REALTIME_ACTIVE_SYMBOLS_WINDOW_MS') ??
        String(MarketActivityTrackerService.DEFAULT_ACTIVITY_WINDOW_MS),
    );
    this.activityWindowMs =
      Number.isFinite(activityWindow) && activityWindow >= 1_000
        ? Math.floor(activityWindow)
        : MarketActivityTrackerService.DEFAULT_ACTIVITY_WINDOW_MS;

    const ttl = Number(
      this.configService.get<string>('REALTIME_ACTIVE_SYMBOLS_TTL_MS') ??
        String(MarketActivityTrackerService.DEFAULT_ACTIVE_TTL_MS),
    );
    this.activeTtlMs =
      Number.isFinite(ttl) && ttl >= 1_000
        ? Math.floor(ttl)
        : MarketActivityTrackerService.DEFAULT_ACTIVE_TTL_MS;

    const alpha = Number(
      this.configService.get<string>('REALTIME_ACTIVE_SYMBOLS_EMA_ALPHA') ??
        String(MarketActivityTrackerService.DEFAULT_EMA_ALPHA),
    );
    this.emaAlpha = Number.isFinite(alpha) && alpha > 0 && alpha <= 1 ? alpha : 0.2;
  }

  public async start(): Promise<{ started: boolean; symbolsTracked: number }> {
    if (this.isBootstrapped || this.isStarting) {
      return {
        started: false,
        symbolsTracked: this.trackedSymbols.size,
      };
    }
    this.isStarting = true;
    this.reconcileTimer = setInterval(() => {
      this.reconcileActivity();
    }, this.reconcileMs);

    try {
      await this.bootstrap();
      return {
        started: this.isBootstrapped,
        symbolsTracked: this.trackedSymbols.size,
      };
    } finally {
      this.isStarting = false;
    }
  }

  public onModuleDestroy(): void {
    this.isBootstrapped = false;
    this.isStarting = false;
    if (this.reconcileTimer) {
      clearInterval(this.reconcileTimer);
      this.reconcileTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    for (const socket of this.sockets) {
      socket.close();
    }
    this.sockets = [];
    this.symbolStates.clear();
    this.activeSymbols.clear();
    this.trackedSymbols.clear();
  }

  public getActiveSymbols(): RealtimeActiveSymbolView[] {
    return Array.from(this.activeSymbols.entries())
      .map(([symbol, value]) => ({
        symbol,
        tradesPerSecond: value.tradesPerSecond,
        lastActiveAt: value.lastActiveAt.toISOString(),
      }))
      .sort((a, b) => b.tradesPerSecond - a.tradesPerSecond);
  }

  public getStatus(): RealtimeMarketActivityStatusView {
    return {
      started: this.isBootstrapped,
      starting: this.isStarting,
      trackedSymbols: this.trackedSymbols.size,
      activeSymbols: this.activeSymbols.size,
      sockets: this.sockets.length,
    };
  }

  private async bootstrap(): Promise<void> {
    try {
      const symbols = await this.fetchTrackedUsdtSymbols();
      this.trackedSymbols.clear();
      for (const symbol of symbols) {
        this.trackedSymbols.add(symbol);
      }

      this.openSockets(symbols);
      this.isBootstrapped = true;
      this.logger.log(
        `Started market activity tracker: symbols=${symbols.length} threshold=${this.tpsThreshold}tps windowMs=${this.activityWindowMs} ttlMs=${this.activeTtlMs} alpha=${this.emaAlpha}`,
        MarketActivityTrackerService.LOG_CONTEXT,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to bootstrap market activity tracker: ${message}`,
        undefined,
        MarketActivityTrackerService.LOG_CONTEXT,
      );
    }
  }

  private async fetchTrackedUsdtSymbols(): Promise<string[]> {
    const response = await this.http.get<ExchangeInfoResponse>(
      '/fapi/v1/exchangeInfo',
    );
    return response.data.symbols
      .filter((item) => item.status === 'TRADING' && item.quoteAsset === 'USDT')
      .map((item) => item.symbol);
  }

  private openSockets(symbols: string[]): void {
    for (const socket of this.sockets) {
      socket.close();
    }
    this.sockets = [];

    if (symbols.length === 0) {
      return;
    }

    const chunks: string[][] = [];
    for (let i = 0; i < symbols.length; i += MarketActivityTrackerService.STREAMS_PER_SOCKET) {
      chunks.push(
        symbols.slice(i, i + MarketActivityTrackerService.STREAMS_PER_SOCKET),
      );
    }

    for (const chunk of chunks) {
      const streamPath = chunk
        .map((symbol) => `${symbol.toLowerCase()}@aggTrade`)
        .join('/');
      const socket = this.createWebSocket(
        `wss://fstream.binance.com/stream?streams=${streamPath}`,
      );

      socket.onmessage = (event) => {
        this.handleSocketMessage(event.data);
      };
      socket.onerror = () => {
        if (this.isBootstrapped) {
          this.logger.warn(
            'Market activity stream error, reconnecting...',
            MarketActivityTrackerService.LOG_CONTEXT,
          );
        }
      };
      socket.onclose = () => {
        if (this.isBootstrapped) {
          this.scheduleReconnect();
        }
      };
      this.sockets.push(socket);
    }
  }

  private createWebSocket(url: string): WebSocketLike {
    const WebSocketCtor = (globalThis as { WebSocket?: new (url: string) => WebSocketLike })
      .WebSocket;
    if (!WebSocketCtor) {
      throw new Error('WebSocket is not available in current runtime');
    }
    return new WebSocketCtor(url);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.isBootstrapped) {
        this.openSockets(Array.from(this.trackedSymbols.values()));
      }
    }, 1000);
  }

  private handleSocketMessage(raw: unknown): void {
    if (typeof raw !== 'string') {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as
        | { data?: AggTradeEvent }
        | AggTradeEvent;
      const event = 'data' in parsed && parsed.data ? parsed.data : parsed as AggTradeEvent;
      const symbol = event.s;
      if (!symbol || !this.trackedSymbols.has(symbol)) {
        return;
      }
      const state = this.ensureSymbolState(symbol);
      if (state.windowStartMs === null) {
        state.windowStartMs = Date.now();
      }
      state.windowTradeCount += 1;
    } catch {
      // ignore malformed frame
    }
  }

  private reconcileActivity(): void {
    const nowMs = Date.now();
    for (const symbol of this.trackedSymbols.values()) {
      const state = this.ensureSymbolState(symbol);

      if (state.windowStartMs === null) {
        state.windowStartMs = nowMs;
      }

      const elapsedMs = nowMs - state.windowStartMs;
      if (elapsedMs >= this.activityWindowMs) {
        const instantTps =
          state.windowTradeCount / Math.max(elapsedMs / 1000, 1e-6);
        state.avgTradesPerSec = this.ema(state.avgTradesPerSec, instantTps);
        state.windowTradeCount = 0;
        state.windowStartMs = nowMs;
      }

      const avgTps = state.avgTradesPerSec ?? 0;
      if (avgTps >= this.tpsThreshold) {
        state.lastActiveAtMs = nowMs;
      }

      const inTtl =
        state.lastActiveAtMs !== null &&
        nowMs - state.lastActiveAtMs <= this.activeTtlMs;
      if (avgTps >= this.tpsThreshold || inTtl) {
        this.activeSymbols.set(symbol, {
          tradesPerSecond: Number(avgTps.toFixed(1)),
          lastActiveAt: new Date(state.lastActiveAtMs ?? nowMs),
        });
      } else {
        this.activeSymbols.delete(symbol);
      }
    }
  }

  private ensureSymbolState(symbol: string): SymbolActivityState {
    const existing = this.symbolStates.get(symbol);
    if (existing) {
      return existing;
    }
    const created: SymbolActivityState = {
      windowStartMs: null,
      windowTradeCount: 0,
      avgTradesPerSec: null,
      lastActiveAtMs: null,
    };
    this.symbolStates.set(symbol, created);
    return created;
  }

  private ema(previous: number | null, value: number): number {
    if (previous === null) {
      return value;
    }
    return previous + this.emaAlpha * (value - previous);
  }
}
