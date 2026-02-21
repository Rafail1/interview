import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import { FVGZone } from 'src/backtesting/domain/entities/fvg-zone.entity';
import { OHLCV } from 'src/backtesting/domain/value-objects/ohlcv.value-object';
import { Timeframe } from 'src/backtesting/domain/value-objects/timeframe.value-object';
import { Timestamp } from 'src/backtesting/domain/value-objects/timestamp.value-object';
import { StrategyEvaluator } from './strategy.evaluator';

function makeCandle(
  openTimeMs: number,
  timeframe: '1m' | '15m',
  values: { open: string; high: string; low: string; close: string },
): Candle {
  const closeOffset = timeframe === '1m' ? 59_999 : 899_999;
  return Candle.create(
    'BTCUSDT',
    Timeframe.from(timeframe),
    openTimeMs,
    openTimeMs + closeOffset,
    OHLCV.from(values.open, values.high, values.low, values.close, '10', '100'),
  );
}

describe('StrategyEvaluator', () => {
  it('detects FVG on higher timeframe only once per higher candle', () => {
    const fvgZone = FVGZone.createBullish(
      'zone-1',
      OHLCV.from('101', '102', '100', '101', '1', '1').getHigh(),
      OHLCV.from('101', '102', '100', '101', '1', '1').getLow(),
      Timestamp.fromMs(1_700_000_000_000),
    );

    const fvgDetectorMock = {
      detect: jest.fn(),
      getCurrentState: jest.fn().mockReturnValue([fvgZone]),
      reset: jest.fn(),
    } as any;

    const structureDetectorMock = {
      detect: jest.fn().mockReturnValue(null),
      reset: jest.fn(),
    } as any;

    const evaluator = new StrategyEvaluator(fvgDetectorMock, structureDetectorMock);
    const lower1 = makeCandle(1_700_000_000_000, '1m', {
      open: '103',
      high: '104',
      low: '101',
      close: '103',
    });
    const lower2 = makeCandle(1_700_000_060_000, '1m', {
      open: '103',
      high: '104',
      low: '101',
      close: '103',
    });
    const higher = makeCandle(1_700_000_000_000, '15m', {
      open: '100',
      high: '105',
      low: '99',
      close: '104',
    });

    evaluator.evaluate(lower1, higher);
    evaluator.evaluate(lower2, higher);

    expect(fvgDetectorMock.detect).toHaveBeenCalledTimes(1);
    expect(fvgDetectorMock.detect).toHaveBeenCalledWith(higher);
  });

  it('emits BUY only when BOS occurs after bullish reaction to active HTF zone', () => {
    const zone = FVGZone.createBullish(
      'zone-react',
      OHLCV.from('101', '102', '100', '101', '1', '1').getHigh(),
      OHLCV.from('101', '102', '100', '101', '1', '1').getLow(),
      Timestamp.fromMs(1_700_000_000_000),
    );

    const fvgDetectorMock = {
      detect: jest.fn(),
      getCurrentState: jest.fn().mockReturnValue([zone]),
      reset: jest.fn(),
    } as any;

    const structureDetectorMock = {
      detect: jest
        .fn()
        .mockReturnValueOnce(null)
        .mockReturnValueOnce({
          getBoSType: () => 'bullish',
        }),
      reset: jest.fn(),
    } as any;

    const evaluator = new StrategyEvaluator(fvgDetectorMock, structureDetectorMock);
    const reactionCandle = makeCandle(1_700_000_000_000, '1m', {
      open: '101',
      high: '103',
      low: '101',
      close: '102',
    });
    const bosCandle = makeCandle(1_700_000_060_000, '1m', {
      open: '103',
      high: '106',
      low: '102',
      close: '105',
    });
    const higher = makeCandle(1_700_000_000_000, '15m', {
      open: '108',
      high: '110',
      low: '99',
      close: '100',
    });

    const first = evaluator.evaluate(reactionCandle, higher);
    const second = evaluator.evaluate(bosCandle, higher);

    expect(first).toEqual([]);
    expect(second).toHaveLength(1);
    expect(second[0].getType()).toBe('BUY');
    expect(second[0].getReason()).toBe('bullish_bos_fvg_reaction_confluence');
    expect(second[0].getMetadata()).toEqual(
      expect.objectContaining({ reactedZoneId: 'zone-react' }),
    );
    expect(second[0].getMetadata()).toEqual(
      expect.objectContaining({
        entryZone: expect.objectContaining({
          type: expect.any(String),
          lowerBound: expect.any(String),
          upperBound: expect.any(String),
        }),
      }),
    );
  });
});
