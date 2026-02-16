import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import { Signal } from 'src/backtesting/domain/entities/signal.entity';
import { OHLCV } from 'src/backtesting/domain/value-objects/ohlcv.value-object';
import { Timeframe } from 'src/backtesting/domain/value-objects/timeframe.value-object';
import { Timestamp } from 'src/backtesting/domain/value-objects/timestamp.value-object';
import { RunBacktestUseCase } from './run-backtest.use-case';

function makeCandle(
  openTimeMs: number,
  closeValue: string,
  timeframe = '1m',
  closeOffsetMs = 59_999,
): Candle {
  return Candle.create(
    'BTCUSDT',
    Timeframe.from(timeframe),
    openTimeMs,
    openTimeMs + closeOffsetMs,
    OHLCV.from(closeValue, closeValue, closeValue, closeValue, '10', '100'),
  );
}

async function* stream(candles: Candle[]): AsyncGenerator<Candle> {
  for (const candle of candles) {
    yield candle;
  }
}

describe('RunBacktestUseCase', () => {
  it('streams candles, processes signals, closes open trade, and returns summary', async () => {
    const candle1 = makeCandle(1_700_000_000_000, '100');
    const candle2 = makeCandle(1_700_000_060_000, '102');
    const candle15m = makeCandle(1_700_000_000_000, '101', '15m', 899_999);

    const marketDataRepositoryMock = {
      getCandleStream: jest
        .fn()
        .mockImplementation(() => stream([candle1, candle2])),
      getAggregatedStream: jest.fn().mockImplementation(() => stream([candle15m])),
    } as any;

    const buySignal = Signal.createBuy(
      'sig-1',
      candle1.getClose(),
      Timestamp.fromMs(1_700_000_000_000),
      'test_buy',
    );
    const strategyEvaluatorMock = {
      reset: jest.fn(),
      evaluate: jest
        .fn()
        .mockReturnValueOnce([buySignal])
        .mockReturnValueOnce([]),
    } as any;

    const trade = {
      isClosed: jest.fn().mockReturnValue(false),
      getPnL: jest.fn().mockReturnValue(null),
    };
    const tradeSimulatorMock = {
      reset: jest.fn(),
      getOpenTrade: jest
        .fn()
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(trade),
      processSignal: jest.fn(),
      closeOpenTrade: jest.fn(),
      getClosedTrades: jest.fn().mockReturnValue([]),
    } as any;

    const useCase = new RunBacktestUseCase(
      marketDataRepositoryMock,
      strategyEvaluatorMock,
      tradeSimulatorMock,
    );

    const result = await useCase.execute({
      symbol: 'BTCUSDT',
      startDate: '2024-01-01T00:00:00.000Z',
      endDate: '2024-01-01T00:10:00.000Z',
      fromInterval: '1m',
      toInterval: '15m',
      initialBalance: 10000,
      riskPercent: 2,
      rewardRatio: 2,
    });

    expect(strategyEvaluatorMock.reset).toHaveBeenCalled();
    expect(tradeSimulatorMock.reset).toHaveBeenCalled();
    expect(marketDataRepositoryMock.getCandleStream).toHaveBeenCalled();
    expect(marketDataRepositoryMock.getAggregatedStream).toHaveBeenCalled();
    expect(strategyEvaluatorMock.evaluate).toHaveBeenCalledTimes(2);
    expect(strategyEvaluatorMock.evaluate).toHaveBeenNthCalledWith(
      1,
      candle1,
      candle15m,
    );
    expect(tradeSimulatorMock.processSignal).toHaveBeenCalledTimes(1);
    expect(tradeSimulatorMock.closeOpenTrade).toHaveBeenCalledWith(
      candle2,
      'end_of_backtest',
    );
    expect(result).toHaveProperty('processedCandles', 2);
    expect(result).toHaveProperty('generatedSignals', 1);
    expect(result).toHaveProperty('metrics.totalTrades', 0);
  });

  it('throws when startDate is after endDate', async () => {
    const useCase = new RunBacktestUseCase({} as any, {} as any, {} as any);

    await expect(
      useCase.execute({
        symbol: 'BTCUSDT',
        startDate: '2024-02-01T00:00:00.000Z',
        endDate: '2024-01-01T00:00:00.000Z',
      } as any),
    ).rejects.toThrow('startDate must be before or equal to endDate');
  });

  it('skips aggregated stream when fromInterval equals toInterval', async () => {
    const candle1 = makeCandle(1_700_000_000_000, '100');
    const candle2 = makeCandle(1_700_000_060_000, '102');

    const marketDataRepositoryMock = {
      getCandleStream: jest
        .fn()
        .mockImplementation(() => stream([candle1, candle2])),
      getAggregatedStream: jest.fn(),
    } as any;

    const strategyEvaluatorMock = {
      reset: jest.fn(),
      evaluate: jest.fn().mockReturnValue([]),
    } as any;

    const tradeSimulatorMock = {
      reset: jest.fn(),
      getOpenTrade: jest.fn().mockReturnValue(null),
      processSignal: jest.fn(),
      closeOpenTrade: jest.fn(),
      getClosedTrades: jest.fn().mockReturnValue([]),
    } as any;

    const useCase = new RunBacktestUseCase(
      marketDataRepositoryMock,
      strategyEvaluatorMock,
      tradeSimulatorMock,
    );

    await useCase.execute({
      symbol: 'BTCUSDT',
      startDate: '2024-01-01T00:00:00.000Z',
      endDate: '2024-01-01T00:10:00.000Z',
      fromInterval: '1m',
      toInterval: '1m',
    });

    expect(marketDataRepositoryMock.getAggregatedStream).not.toHaveBeenCalled();
    expect(strategyEvaluatorMock.evaluate).toHaveBeenNthCalledWith(
      1,
      candle1,
      candle1,
    );
    expect(strategyEvaluatorMock.evaluate).toHaveBeenNthCalledWith(
      2,
      candle2,
      candle2,
    );
  });
});
