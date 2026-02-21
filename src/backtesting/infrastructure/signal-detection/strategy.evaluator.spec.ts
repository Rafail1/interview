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

  it('emits BUY only when BOS occurs after bullish reaction to active HTF FVG', () => {
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
      open: '100',
      high: '110',
      low: '99',
      close: '108',
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
        fvg: expect.objectContaining({
          lowerBound: expect.any(String),
          sizePercent: expect.any(Number),
          upperBound: expect.any(String),
        }),
      }),
    );
  });

  it('filters out bullish signal when reacted FVG is too large', () => {
    const zone = FVGZone.createBullish(
      'zone-large',
      OHLCV.from('100', '105', '100', '104', '1', '1').getHigh(),
      OHLCV.from('100', '105', '100', '104', '1', '1').getLow(),
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
      open: '100',
      high: '106',
      low: '100',
      close: '105',
    });
    const bosCandle = makeCandle(1_700_000_060_000, '1m', {
      open: '105',
      high: '107',
      low: '104',
      close: '105',
    });
    const higher = makeCandle(1_700_000_000_000, '15m', {
      open: '99',
      high: '110',
      low: '98',
      close: '108',
    });

    evaluator.evaluate(reactionCandle, higher);
    const signals = evaluator.evaluate(bosCandle, higher);

    expect(signals).toHaveLength(1);
    expect(signals[0].getType()).toBe('INVALID');
    expect(signals[0].getReason()).toBe('bullish_bos_fvg_size_filtered');
  });

  it('allows small FVG when configured min threshold is lower', () => {
    const zone = FVGZone.createBullish(
      'zone-small',
      OHLCV.from('99.8', '100', '99.5', '99.9', '1', '1').getHigh(),
      OHLCV.from('99.8', '100', '99.5', '99.9', '1', '1').getLow(),
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
    evaluator.configure({ minFvgSizePercent: 0.3, maxFvgSizePercent: 4 });
    const reactionCandle = makeCandle(1_700_000_000_000, '1m', {
      open: '99.6',
      high: '100.2',
      low: '99.4',
      close: '100',
    });
    const bosCandle = makeCandle(1_700_000_060_000, '1m', {
      open: '100',
      high: '101',
      low: '99.8',
      close: '100.1',
    });
    const higher = makeCandle(1_700_000_000_000, '15m', {
      open: '99',
      high: '102',
      low: '98',
      close: '101',
    });

    evaluator.evaluate(reactionCandle, higher);
    const signals = evaluator.evaluate(bosCandle, higher);

    expect(signals).toHaveLength(1);
    expect(signals[0].getType()).toBe('BUY');
  });
});
