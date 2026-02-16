import { Candle } from 'src/backtesting/domain/entities/candle.entity';
import { OHLCV } from 'src/backtesting/domain/value-objects/ohlcv.value-object';
import { Timeframe } from 'src/backtesting/domain/value-objects/timeframe.value-object';
import { MarketDataMapper } from './market-data.mapper';

describe('MarketDataMapper', () => {
  const mapper = new MarketDataMapper();

  it('maps domain candle to persistence record', () => {
    const candle = Candle.create(
      'BTCUSDT',
      Timeframe.from('1m'),
      1_700_000_000_000,
      1_700_000_059_999,
      OHLCV.from('100', '110', '90', '105', '1000', '105000'),
    );

    const record = mapper.toPersistence(candle);

    expect(record.symbol).toBe('BTCUSDT');
    expect(record.interval).toBe('1m');
    expect(record.open).toBe('100');
    expect(record.high).toBe('110');
    expect(record.low).toBe('90');
    expect(record.close).toBe('105');
    expect(record.volume).toBe('1000');
    expect(record.quoteAssetVolume).toBe('105000');
    expect(record.numberOfTrades).toBe(0);
  });

  it('maps persistence record to domain candle', () => {
    const candle = mapper.toDomain({
      id: 'md-1',
      symbol: 'BTCUSDT',
      interval: '1m',
      openTime: 1_700_000_000_000n,
      closeTime: 1_700_000_059_999n,
      open: '100',
      high: '110',
      low: '90',
      close: '105',
      volume: '1000',
      quoteAssetVolume: '105000',
      numberOfTrades: 25,
      takerBuyBaseVolume: '500',
      takerBuyQuoteVolume: '52500',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
    });

    expect(candle.getSymbol()).toBe('BTCUSDT');
    expect(candle.getTimeframe().toString()).toBe('1m');
    expect(candle.getOpen().toString()).toBe('100');
    expect(candle.getHigh().toString()).toBe('110');
    expect(candle.getLow().toString()).toBe('90');
    expect(candle.getClose().toString()).toBe('105');
    expect(candle.getVolume().toString()).toBe('1000');
  });
});
