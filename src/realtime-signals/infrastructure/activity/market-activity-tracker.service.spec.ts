import { MarketActivityTrackerService } from './market-activity-tracker.service';

describe('MarketActivityTrackerService', () => {
  const loggerMock = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps symbol active via TTL when TPS drops below threshold', () => {
    const configServiceMock = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'REALTIME_ACTIVE_SYMBOLS_TPS_THRESHOLD':
            return '18';
          case 'REALTIME_ACTIVE_SYMBOLS_WINDOW_MS':
            return '3000';
          case 'REALTIME_ACTIVE_SYMBOLS_TTL_MS':
            return '60000';
          case 'REALTIME_ACTIVE_SYMBOLS_EMA_ALPHA':
            return '0.2';
          default:
            return undefined;
        }
      }),
    };

    const service = new MarketActivityTrackerService(
      configServiceMock as any,
      loggerMock as any,
    );
    const internal = service as any;
    internal.trackedSymbols.add('BTCUSDT');
    internal.symbolStates.set('BTCUSDT', {
      windowStartMs: 1_000,
      windowTradeCount: 60,
      avgTradesPerSec: null,
      lastActiveAtMs: null,
    });

    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(4_000);
    internal.reconcileActivity();
    expect(service.getActiveSymbols().some((x) => x.symbol === 'BTCUSDT')).toBe(
      true,
    );

    internal.symbolStates.set('BTCUSDT', {
      windowStartMs: 4_000,
      windowTradeCount: 0,
      avgTradesPerSec: 20,
      lastActiveAtMs: 4_000,
    });
    nowSpy.mockReturnValue(7_000);
    internal.reconcileActivity();
    expect(service.getActiveSymbols().some((x) => x.symbol === 'BTCUSDT')).toBe(
      true,
    );

    internal.symbolStates.set('BTCUSDT', {
      windowStartMs: 7_000,
      windowTradeCount: 0,
      avgTradesPerSec: 16,
      lastActiveAtMs: 4_000,
    });
    nowSpy.mockReturnValue(67_001);
    internal.reconcileActivity();
    expect(service.getActiveSymbols().some((x) => x.symbol === 'BTCUSDT')).toBe(
      false,
    );

    nowSpy.mockRestore();
  });

  it('counts trades from tracked symbol only', () => {
    const configServiceMock = {
      get: jest.fn().mockReturnValue(undefined),
    };

    const service = new MarketActivityTrackerService(
      configServiceMock as any,
      loggerMock as any,
    );
    const internal = service as any;
    internal.trackedSymbols.add('ETHUSDT');

    internal.handleSocketMessage(
      JSON.stringify({
        stream: 'ethusdt@aggTrade',
        data: { s: 'ETHUSDT' },
      }),
    );
    internal.handleSocketMessage(
      JSON.stringify({
        stream: 'btcusdt@aggTrade',
        data: { s: 'BTCUSDT' },
      }),
    );

    const state = internal.symbolStates.get('ETHUSDT');
    expect(state).toBeDefined();
    expect(state.windowTradeCount).toBe(1);
    expect(internal.symbolStates.has('BTCUSDT')).toBe(false);
  });
});
