import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import { OHLCV } from 'src/backtesting/domain/value-objects/ohlcv.value-object';
import { Timeframe } from 'src/backtesting/domain/value-objects/timeframe.value-object';
import { FvgDetector } from './fvg.detector';

function makeCandle(
  openTimeMs: number,
  values: { open: string; high: string; low: string; close: string },
): Candle {
  return Candle.create(
    'BTCUSDT',
    Timeframe.from('15m'),
    openTimeMs,
    openTimeMs + 899_999,
    OHLCV.from(values.open, values.high, values.low, values.close, '10', '100'),
  );
}

describe('FvgDetector', () => {
  it('does not immediately mark newly created zone as mitigated on same candle', () => {
    const detector = new FvgDetector();
    const c1 = makeCandle(1_700_000_000_000, {
      open: '100',
      high: '100',
      low: '95',
      close: '98',
    });
    const c2 = makeCandle(1_700_000_900_000, {
      open: '101',
      high: '105',
      low: '99',
      close: '104',
    });
    const c3 = makeCandle(1_700_001_800_000, {
      open: '110',
      high: '115',
      low: '110',
      close: '112',
    });

    detector.detect(c1);
    detector.detect(c2);
    const detected = detector.detect(c3);

    expect(detected).toHaveLength(1);
    expect(detected[0].isBullish()).toBe(true);
    expect(detected[0].isMitigated()).toBe(false);
    expect(detector.getActiveFvgs()).toHaveLength(1);
  });

  it('still mitigates previously existing zone when later candle touches it', () => {
    const detector = new FvgDetector();
    const c1 = makeCandle(1_700_000_000_000, {
      open: '100',
      high: '100',
      low: '95',
      close: '98',
    });
    const c2 = makeCandle(1_700_000_900_000, {
      open: '101',
      high: '105',
      low: '99',
      close: '104',
    });
    const c3 = makeCandle(1_700_001_800_000, {
      open: '110',
      high: '115',
      low: '110',
      close: '112',
    });
    const c4 = makeCandle(1_700_002_700_000, {
      open: '112',
      high: '113',
      low: '99',
      close: '101',
    });

    detector.detect(c1);
    detector.detect(c2);
    const detected = detector.detect(c3);
    expect(detected[0].isMitigated()).toBe(false);

    detector.detect(c4);
    expect(detector.getMitigatedFvgs()).toHaveLength(1);
    expect(detector.getActiveFvgs()).toHaveLength(0);
  });
});
