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
    expect(closed?.getPnL()?.toFixed(2)).toBe('400.00');
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
    expect(closed?.getPnL()?.toFixed(2)).toBe('-200.00');
  });

  it('sizes position dynamically from riskPercent', () => {
    const simulator = new TradeSimulator();
    const risk = RiskModel.from(2, 2);
    const signal = Signal.createBuy(
      'buy-3',
      OHLCV.from('100', '100', '100', '100', '1', '1').getClose(),
      Timestamp.fromMs(1_700_000_000_000),
      'test',
    );

    const opened = simulator.processSignal(signal, risk);
    expect(opened).not.toBeNull();
    expect(opened?.getQuantity().toFixed(2)).toBe('100.00');
    expect(opened?.getStopLossPrice()?.toString()).toBe('98');
    expect(opened?.getTakeProfitPrice()?.toString()).toBe('104');
  });

  it('uses FVG lowerBound as BUY stop-loss when present in signal metadata', () => {
    const simulator = new TradeSimulator();
    const risk = RiskModel.from(2, 2);
    const signal = Signal.createBuy(
      'buy-4',
      OHLCV.from('100', '100', '100', '100', '1', '1').getClose(),
      Timestamp.fromMs(1_700_000_000_000),
      'test',
      {
        fvg: {
          lowerBound: '95',
          upperBound: '105',
        },
      },
    );

    const opened = simulator.processSignal(signal, risk);
    expect(opened).not.toBeNull();
    expect(opened?.getQuantity().toFixed(2)).toBe('40.00');
    expect(opened?.getStopLossPrice()?.toString()).toBe('95');
    expect(opened?.getTakeProfitPrice()?.toString()).toBe('110');
  });

  it('falls back to riskPercent stop-loss if FVG stop is invalid for side', () => {
    const simulator = new TradeSimulator();
    const risk = RiskModel.from(2, 2);
    const signal = Signal.createBuy(
      'buy-5',
      OHLCV.from('100', '100', '100', '100', '1', '1').getClose(),
      Timestamp.fromMs(1_700_000_000_000),
      'test',
      {
        fvg: {
          lowerBound: '101',
          upperBound: '110',
        },
      },
    );

    const opened = simulator.processSignal(signal, risk);
    expect(opened).not.toBeNull();
    expect(opened?.getQuantity().toFixed(2)).toBe('100.00');
    expect(opened?.getStopLossPrice()?.toString()).toBe('98');
    expect(opened?.getTakeProfitPrice()?.toString()).toBe('104');
  });

  it('moves stop-loss to entry after reaching 1:1 and exits at break-even on pullback', () => {
    const simulator = new TradeSimulator();
    const risk = RiskModel.from(2, 2);
    const signal = Signal.createBuy(
      'buy-6',
      OHLCV.from('100', '100', '100', '100', '1', '1').getClose(),
      Timestamp.fromMs(1_700_000_000_000),
      'test',
    );

    simulator.processSignal(signal, risk);

    const oneToOneReached = makeCandle(1_700_000_060_000, {
      open: '100',
      high: '102.5',
      low: '99.5',
      close: '101',
    });
    const firstCloseAttempt = simulator.closeOpenTrade(oneToOneReached, 'risk_check');
    expect(firstCloseAttempt).toBeNull();
    expect(simulator.getOpenTrade()?.getStopLossPrice()?.toString()).toBe('100');

    const pullbackToEntry = makeCandle(1_700_000_120_000, {
      open: '101',
      high: '101.2',
      low: '99.8',
      close: '100.2',
    });
    const closed = simulator.closeOpenTrade(pullbackToEntry, 'risk_check');
    expect(closed).not.toBeNull();
    expect(closed?.getExitPrice()?.toString()).toBe('100');
    expect(closed?.getPnL()?.toFixed(2)).toBe('0.00');
  });
});
