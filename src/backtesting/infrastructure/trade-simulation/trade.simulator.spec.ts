import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import { Signal } from 'src/backtesting/domain/entities/signal.entity';
import { OHLCV } from 'src/backtesting/domain/value-objects/ohlcv.value-object';
import { RiskModel } from 'src/backtesting/domain/value-objects/risk-model.value-object';
import { Timeframe } from 'src/backtesting/domain/value-objects/timeframe.value-object';
import { Timestamp } from 'src/backtesting/domain/value-objects/timestamp.value-object';
import { TradeSimulator } from './trade.simulator';

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

describe('TradeSimulator', () => {
  it('closes BUY on take-profit when candle range hits target', () => {
    const simulator = new TradeSimulator();
    const risk = RiskModel.from(2, 2);
    const signal = Signal.createBuy(
      'buy-1',
      OHLCV.from('100', '100', '100', '100', '1', '1').getClose(),
      Timestamp.fromMs(1_700_000_000_000),
      'test',
    );

    simulator.processSignal(signal, risk);
    const exitCandle = makeCandle(1_700_000_060_000, {
      open: '100',
      high: '104',
      low: '99',
      close: '103',
    });

    const closed = simulator.closeOpenTrade(exitCandle, 'risk_check');
    expect(closed).not.toBeNull();
    expect(closed?.getPnL()?.toFixed(2)).toBe('8.00');
  });

  it('uses conservative stop-first assumption when both SL and TP hit in same candle', () => {
    const simulator = new TradeSimulator();
    const risk = RiskModel.from(2, 2);
    const signal = Signal.createBuy(
      'buy-2',
      OHLCV.from('100', '100', '100', '100', '1', '1').getClose(),
      Timestamp.fromMs(1_700_000_000_000),
      'test',
    );

    simulator.processSignal(signal, risk);
    const ambiguousCandle = makeCandle(1_700_000_060_000, {
      open: '100',
      high: '104',
      low: '98',
      close: '101',
    });

    const closed = simulator.closeOpenTrade(ambiguousCandle, 'risk_check');
    expect(closed).not.toBeNull();
    expect(closed?.getPnL()?.toFixed(2)).toBe('-4.00');
  });
});
