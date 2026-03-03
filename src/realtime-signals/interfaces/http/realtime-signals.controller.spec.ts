import { BadRequestException } from '@nestjs/common';
import { RealtimeSignalsController } from './realtime-signals.controller';

describe('RealtimeSignalsController', () => {
  it('starts tracking symbols', async () => {
    const startUseCase = {
      execute: jest.fn().mockResolvedValue({
        started: ['BTCUSDT'],
        alreadyTracking: [],
        tracked: [
          {
            symbol: 'BTCUSDT',
            activeFvgCount: 5,
            startedAt: '2026-02-21T20:00:00.000Z',
          },
        ],
      }),
    } as any;
    const stopUseCase = { execute: jest.fn() } as any;
    const listUseCase = { execute: jest.fn() } as any;
    const listFvgZonesUseCase = { execute: jest.fn() } as any;
    const listActiveSymbolsUseCase = { execute: jest.fn() } as any;
    const startMarketActivityTrackerUseCase = { execute: jest.fn() } as any;
    const getMarketActivityTrackerStatusUseCase = { execute: jest.fn() } as any;

    const controller = new RealtimeSignalsController(
      startUseCase,
      stopUseCase,
      listUseCase,
      listFvgZonesUseCase,
      listActiveSymbolsUseCase,
      startMarketActivityTrackerUseCase,
      getMarketActivityTrackerStatusUseCase,
    );

    const result = await controller.startTracking({ symbols: ['BTCUSDT'] });
    expect(startUseCase.execute).toHaveBeenCalledWith({ symbols: ['BTCUSDT'] });
    expect(result).toEqual(
      expect.objectContaining({
        started: ['BTCUSDT'],
      }),
    );
  });

  it('maps client input errors to bad request', async () => {
    const startUseCase = {
      execute: jest
        .fn()
        .mockRejectedValue(new Error('symbols must contain at least one valid symbol')),
    } as any;

    const controller = new RealtimeSignalsController(
      startUseCase,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
    );

    await expect(controller.startTracking({ symbols: [] as string[] })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('stops tracking symbol', () => {
    const stopUseCase = {
      execute: jest.fn().mockReturnValue({
        symbol: 'BTCUSDT',
        stopped: true,
        tracked: [],
      }),
    } as any;

    const controller = new RealtimeSignalsController(
      { execute: jest.fn() } as any,
      stopUseCase,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
    );

    const result = controller.stopTracking({ symbol: 'BTCUSDT' });
    expect(stopUseCase.execute).toHaveBeenCalledWith({ symbol: 'BTCUSDT' });
    expect(result).toEqual(
      expect.objectContaining({
        symbol: 'BTCUSDT',
        stopped: true,
      }),
    );
  });

  it('lists tracked symbols', () => {
    const listUseCase = {
      execute: jest.fn().mockReturnValue({
        tracked: [
          {
            symbol: 'ETHUSDT',
            activeFvgCount: 2,
            startedAt: '2026-02-21T20:00:00.000Z',
          },
        ],
      }),
    } as any;

    const controller = new RealtimeSignalsController(
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      listUseCase,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
    );

    const result = controller.listTrackedSymbols();
    expect(listUseCase.execute).toHaveBeenCalledTimes(1);
    expect(result).toHaveProperty('tracked.0.symbol', 'ETHUSDT');
  });

  it('lists realtime fvg zones', () => {
    const listFvgZonesUseCase = {
      execute: jest.fn().mockReturnValue({
        items: [
          {
            symbol: 'BTCUSDT',
            id: 'fvg-bull-1700000000000',
            direction: 'bullish',
            upperBound: '101',
            lowerBound: '100',
            startTime: '1700000000000',
            endTime: null,
            mitigated: false,
          },
        ],
      }),
    } as any;

    const controller = new RealtimeSignalsController(
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      listFvgZonesUseCase,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
    );

    const result = controller.listFvgZones({ symbol: 'BTCUSDT' });
    expect(listFvgZonesUseCase.execute).toHaveBeenCalledWith({
      symbol: 'BTCUSDT',
    });
    expect(result).toHaveProperty('items.0.symbol', 'BTCUSDT');
  });

  it('lists active symbols by market activity', () => {
    const listActiveSymbolsUseCase = {
      execute: jest.fn().mockReturnValue({
        items: [
          {
            symbol: 'BTCUSDT',
            tradesPerSecond: 52,
            lastActiveAt: '2026-02-26T12:00:00.000Z',
          },
        ],
      }),
    } as any;

    const controller = new RealtimeSignalsController(
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      listActiveSymbolsUseCase,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
    );

    const result = controller.listActiveSymbols();
    expect(listActiveSymbolsUseCase.execute).toHaveBeenCalledTimes(1);
    expect(result).toHaveProperty('items.0.symbol', 'BTCUSDT');
  });

  it('starts market activity tracker manually', async () => {
    const startMarketActivityTrackerUseCase = {
      execute: jest.fn().mockResolvedValue({
        started: true,
        symbolsTracked: 512,
      }),
    } as any;

    const controller = new RealtimeSignalsController(
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      startMarketActivityTrackerUseCase,
      { execute: jest.fn() } as any,
    );

    const result = await controller.startMarketActivityTracker();
    expect(startMarketActivityTrackerUseCase.execute).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      started: true,
      symbolsTracked: 512,
    });
  });

  it('returns market activity tracker status', () => {
    const getMarketActivityTrackerStatusUseCase = {
      execute: jest.fn().mockReturnValue({
        started: true,
        starting: false,
        trackedSymbols: 500,
        activeSymbols: 35,
        sockets: 3,
      }),
    } as any;

    const controller = new RealtimeSignalsController(
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any,
      getMarketActivityTrackerStatusUseCase,
    );

    const result = controller.getMarketActivityTrackerStatus();
    expect(getMarketActivityTrackerStatusUseCase.execute).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      started: true,
      starting: false,
      trackedSymbols: 500,
      activeSymbols: 35,
      sockets: 3,
    });
  });
});
