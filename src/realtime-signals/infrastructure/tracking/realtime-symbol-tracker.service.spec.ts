import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import { Signal } from 'src/backtesting/domain/entities/signal.entity';
import { OHLCV } from 'src/backtesting/domain/value-objects/ohlcv.value-object';
import { Timeframe } from 'src/backtesting/domain/value-objects/timeframe.value-object';
import { RealtimeSymbolTrackerService } from './realtime-symbol-tracker.service';

function makeCandle(
  symbol: string,
  openTimeMs: number,
  timeframe: '1m' | '15m',
  values: { open: string; high: string; low: string; close: string },
): Candle {
  const closeOffset = timeframe === '1m' ? 59_999 : 899_999;
  return Candle.create(
    symbol,
    Timeframe.from(timeframe),
    openTimeMs,
    openTimeMs + closeOffset,
    OHLCV.from(values.open, values.high, values.low, values.close, '10', '100'),
  );
}

describe('RealtimeSymbolTrackerService', () => {
  const configServiceMock = {
    get: jest.fn().mockReturnValue(undefined),
  };
  const loggerMock = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('bootstraps symbol on start and returns tracked list', async () => {
    const marketDataClientMock = {
      getRecentCandles: jest
        .fn()
        .mockResolvedValueOnce([
          makeCandle('BTCUSDT', 1_700_000_000_000, '15m', {
            open: '99',
            high: '100',
            low: '98',
            close: '99',
          }),
          makeCandle('BTCUSDT', 1_700_000_900_000, '15m', {
            open: '100',
            high: '100.5',
            low: '99.5',
            close: '100',
          }),
          makeCandle('BTCUSDT', 1_700_001_800_000, '15m', {
            open: '101',
            high: '102',
            low: '101',
            close: '101.5',
          }),
        ])
        .mockResolvedValueOnce([]),
    } as any;

    const service = new RealtimeSymbolTrackerService(
      configServiceMock as any,
      marketDataClientMock,
      loggerMock as any,
    );

    const result = await service.startTracking(['BTCUSDT']);
    expect(result.started).toEqual(['BTCUSDT']);
    expect(result.alreadyTracking).toEqual([]);
    expect(result.tracked).toHaveLength(1);
    expect(result.tracked[0]).toHaveProperty('symbol', 'BTCUSDT');
    expect(marketDataClientMock.getRecentCandles).toHaveBeenNthCalledWith(
      1,
      'BTCUSDT',
      '15m',
      1000,
    );
    expect(marketDataClientMock.getRecentCandles).toHaveBeenNthCalledWith(
      2,
      'BTCUSDT',
      '1m',
      300,
    );
  });

  it('stops tracking symbol', async () => {
    const marketDataClientMock = {
      getRecentCandles: jest.fn().mockResolvedValue([]),
    } as any;
    const service = new RealtimeSymbolTrackerService(
      configServiceMock as any,
      marketDataClientMock,
      loggerMock as any,
    );

    await service.startTracking(['ETHUSDT']);
    const stopped = service.stopTracking('ETHUSDT');
    expect(stopped).toEqual(
      expect.objectContaining({
        symbol: 'ETHUSDT',
        stopped: true,
      }),
    );
    expect(service.getTrackedSymbols()).toEqual([]);
  });

  it('returns fvg zones for tracked symbol', async () => {
    const marketDataClientMock = {
      getRecentCandles: jest
        .fn()
        .mockResolvedValueOnce([
          makeCandle('BTCUSDT', 1_700_000_000_000, '15m', {
            open: '99',
            high: '100',
            low: '98',
            close: '99',
          }),
          makeCandle('BTCUSDT', 1_700_000_900_000, '15m', {
            open: '100',
            high: '101',
            low: '99.5',
            close: '100',
          }),
          makeCandle('BTCUSDT', 1_700_001_800_000, '15m', {
            open: '101',
            high: '103',
            low: '101',
            close: '102',
          }),
        ])
        .mockResolvedValueOnce([]),
    } as any;

    const service = new RealtimeSymbolTrackerService(
      configServiceMock as any,
      marketDataClientMock,
      loggerMock as any,
    );

    await service.startTracking(['BTCUSDT']);
    const zones = service.listFvgZones('BTCUSDT');

    expect(zones.length).toBeGreaterThan(0);
    expect(zones[0]).toHaveProperty('symbol', 'BTCUSDT');
    expect(zones[0]).toHaveProperty('direction');
  });

  it('emits fvg_zone_touch then entry_confirmation on tick', async () => {
    const nowMs = 1_700_010_000_000;
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(nowMs);

    const history15m = [
      makeCandle('BTCUSDT', nowMs - 4_500_000, '15m', {
        open: '99',
        high: '100',
        low: '98',
        close: '99.5',
      }),
      makeCandle('BTCUSDT', nowMs - 3_600_000, '15m', {
        open: '100',
        high: '100.3',
        low: '99.6',
        close: '100',
      }),
      makeCandle('BTCUSDT', nowMs - 2_700_000, '15m', {
        open: '101',
        high: '102',
        low: '101',
        close: '101.5',
      }),
    ];
    const tick15m = [
      makeCandle('BTCUSDT', nowMs - 1_800_000, '15m', {
        open: '101.2',
        high: '102.2',
        low: '101.1',
        close: '101.8',
      }),
    ];
    const zoneTouch1m = makeCandle('BTCUSDT', nowMs - 120_000, '1m', {
      open: '100.9',
      high: '101.2',
      low: '100.8',
      close: '101.1',
    });

    const marketDataClientMock = {
      getRecentCandles: jest
        .fn()
        .mockResolvedValueOnce(history15m)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(tick15m)
        .mockResolvedValueOnce([zoneTouch1m]),
    } as any;
    const service = new RealtimeSymbolTrackerService(
      configServiceMock as any,
      marketDataClientMock,
      loggerMock as any,
    );

    await service.startTracking(['BTCUSDT']);
    const state = (service as any).states.get('BTCUSDT');
    expect(state).toBeDefined();
    state.strategyEvaluator.evaluate = jest.fn().mockReturnValue([
      Signal.createBuy(
        'sig-1',
        zoneTouch1m.getClose(),
        zoneTouch1m.getCloseTime(),
        'bullish_bos_fvg_reaction_confluence',
        { reactedZoneId: 'fvg-bull-1700007300000' },
      ),
    ]);

    await (service as any).processStateTick(state);

    const signalLogs = loggerMock.log.mock.calls
      .map((call: unknown[]) => call[0])
      .filter((entry: unknown) => typeof entry === 'string')
      .filter((entry: string) => entry.includes('realtime_signal'))
      .map((entry: string) => JSON.parse(entry));

    expect(signalLogs.some((entry: any) => entry.stage === 'fvg_zone_touch')).toBe(true);
    expect(
      signalLogs.some((entry: any) => entry.stage === 'entry_confirmation'),
    ).toBe(true);

    nowSpy.mockRestore();
  });
});
