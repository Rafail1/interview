import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  IRealtimeMarketActivityTracker,
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

@Injectable()
export class MarketActivityTrackerService
  implements IRealtimeMarketActivityTracker, OnModuleInit, OnModuleDestroy
{
  private static readonly LOG_CONTEXT = 'MarketActivityTrackerService';
  private static readonly DEFAULT_TPS_THRESHOLD = 30;
  private static readonly DEFAULT_RECONCILE_MS = 1_000;
  private static readonly STREAMS_PER_SOCKET = 200;

  private readonly http: AxiosInstance;
  private readonly tpsThreshold: number;
  private readonly reconcileMs: number;

  private readonly perSecondCounters = new Map<string, number>();
  private readonly activeSymbols = new Map<
    string,
    { tradesPerSecond: number; lastActiveAt: Date }
  >();
  private readonly trackedSymbols = new Set<string>();
  private sockets: WebSocketLike[] = [];
  private reconcileTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isBootstrapped = false;

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
  }

  public onModuleInit(): void {
    this.reconcileTimer = setInterval(() => {
      this.reconcileActivity();
    }, this.reconcileMs);

    void this.bootstrap();
  }

  public onModuleDestroy(): void {
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
    this.perSecondCounters.clear();
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
        `Started market activity tracker: symbols=${symbols.length} threshold=${this.tpsThreshold}tps`,
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
      this.perSecondCounters.set(symbol, (this.perSecondCounters.get(symbol) ?? 0) + 1);
    } catch {
      // ignore malformed frame
    }
  }

  private reconcileActivity(): void {
    const now = new Date();
    const nextActive = new Map<
      string,
      { tradesPerSecond: number; lastActiveAt: Date }
    >();

    for (const symbol of this.trackedSymbols.values()) {
      const tps = this.perSecondCounters.get(symbol) ?? 0;
      if (tps >= this.tpsThreshold) {
        nextActive.set(symbol, {
          tradesPerSecond: tps,
          lastActiveAt: now,
        });
      }
    }

    this.activeSymbols.clear();
    for (const [symbol, value] of nextActive.entries()) {
      this.activeSymbols.set(symbol, value);
    }
    this.perSecondCounters.clear();
  }
}
