import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import { OHLCV } from 'src/backtesting/domain/value-objects/ohlcv.value-object';
import { Timeframe } from 'src/backtesting/domain/value-objects/timeframe.value-object';
import { StructureDetector } from './structure.detector';

function makeCandle(
  openTimeMs: number,
  values: { open: string; high: string; low: string; close: string },
): Candle {
  return Candle.create(
    'BTCUSDT',
    Timeframe.from('1m'),
    openTimeMs,
    openTimeMs + 59_999,
    OHLCV.from(values.open, values.high, values.low, values.close, '10', '100'),
  );
}

describe('StructureDetector', () => {
  it('can emit BOS more than once across a run', () => {
    const detector = new StructureDetector();

    const init = makeCandle(1_700_000_000_000, {
      open: '100',
      high: '100',
      low: '100',
      close: '100',
    });
    const bullishBos = makeCandle(1_700_000_060_000, {
      open: '100',
      high: '110',
      low: '99',
      close: '105',
    });
    const bearishBos = makeCandle(1_700_000_120_000, {
      open: '105',
      high: '105',
      low: '95',
      close: '96',
    });

    expect(detector.detect(init)).toBeNull();

    const firstBos = detector.detect(bullishBos);
    expect(firstBos?.getBoSType()).toBe('bullish');

    const secondBos = detector.detect(bearishBos);
    expect(secondBos?.getBoSType()).toBe('bearish');
  });
});
