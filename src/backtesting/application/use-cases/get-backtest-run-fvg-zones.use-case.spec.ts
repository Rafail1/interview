import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import { OHLCV, Timeframe } from 'src/backtesting/domain/value-objects';
import { GetBacktestRunFvgZonesUseCase } from './get-backtest-run-fvg-zones.use-case';

async function* toAsync<T>(items: T[]): AsyncIterable<T> {
  for (const item of items) {
    yield item;
  }
}

describe('GetBacktestRunFvgZonesUseCase', () => {
  it('returns null when run does not exist', async () => {
    const backtestRunRepository = {
      findById: jest.fn().mockResolvedValue(null),
      findSignalsByRunId: jest.fn(),
    };
    const marketDataRepository = {
      getCandleStream: jest.fn(),
      getAggregatedStream: jest.fn(),
    };
    const useCase = new GetBacktestRunFvgZonesUseCase(
      backtestRunRepository as any,
      marketDataRepository as any,
    );

    const result = await useCase.execute('missing-run');

    expect(result).toBeNull();
    expect(backtestRunRepository.findSignalsByRunId).not.toHaveBeenCalled();
  });

  it('reconstructs FVG zones and marks opened/not-opened descriptions', async () => {
    const candles = [
      Candle.create(
        'BTCUSDT',
        Timeframe.from('15m'),
        0,
        1,
        OHLCV.from('100', '101', '99', '100', '1', '100'),
      ),
      Candle.create(
        'BTCUSDT',
        Timeframe.from('15m'),
        2,
        3,
        OHLCV.from('100', '102', '99', '101', '1', '100'),
      ),
      Candle.create(
        'BTCUSDT',
        Timeframe.from('15m'),
        4,
        5,
        OHLCV.from('103', '104', '103', '103.5', '1', '100'),
      ),
      Candle.create(
        'BTCUSDT',
        Timeframe.from('15m'),
        6,
        7,
        OHLCV.from('101', '102', '100', '101', '1', '100'),
      ),
    ];

    const backtestRunRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'run-1',
        symbol: 'BTCUSDT',
        interval: '15m',
        config: {
          fromInterval: '1m',
          toInterval: '15m',
        },
        startTime: '0',
        endTime: '10',
        trades: [
          {
            id: 'trade-1',
            entryTime: '7',
            side: 'BUY',
          },
        ],
      }),
      findSignalsByRunId: jest
        .fn()
        .mockResolvedValueOnce({
          items: [
            {
              id: 'sig-1',
              timestamp: '7',
              signalType: 'BUY',
              reason: 'bullish_bos_after_fvg_touch_entry',
              price: '101',
              metadata: {
                reactedZoneId: 'fvg-bull-4',
              },
              createdAt: new Date('2024-01-01T00:00:00.000Z'),
            },
          ],
          nextCursor: null,
        }),
    };
    const marketDataRepository = {
      getCandleStream: jest.fn(),
      getAggregatedStream: jest.fn().mockReturnValue(toAsync(candles)),
    };

    const useCase = new GetBacktestRunFvgZonesUseCase(
      backtestRunRepository as any,
      marketDataRepository as any,
    );

    const result = await useCase.execute('run-1');

    expect(result).not.toBeNull();
    expect(result?.total).toBe(1);
    expect(marketDataRepository.getAggregatedStream).toHaveBeenCalled();
    expect(result?.items[0]).toMatchObject({
      id: 'fvg-bull-4',
      startTime: '4',
      endTime: '7',
    });
    expect(result?.items[0].description).toContain('opened position because');
  });
});
