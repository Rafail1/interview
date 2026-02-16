import { ImportBinanceDataUseCase } from './import-binance-data.use-case';

describe('ImportBinanceDataUseCase', () => {
  const downloadManagerMock = {
    startImport: jest.fn(),
  } as any;

  const marketDataRepositoryMock = {
    hasData: jest.fn(),
  } as any;

  const loggerMock = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when date range is in the future', async () => {
    const useCase = new ImportBinanceDataUseCase(
      downloadManagerMock,
      marketDataRepositoryMock,
      loggerMock,
    );

    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await expect(
      useCase.execute({
        symbol: 'BTCUSDT',
        interval: '1m',
        startDate: future,
        endDate: future,
        overwrite: false,
      }),
    ).rejects.toThrow('Date range cannot be in the future');
  });

  it('returns already-imported result when data exists and overwrite is false', async () => {
    const useCase = new ImportBinanceDataUseCase(
      downloadManagerMock,
      marketDataRepositoryMock,
      loggerMock,
    );

    marketDataRepositoryMock.hasData.mockResolvedValue(true);

    const result = await useCase.execute({
      symbol: 'BTCUSDT',
      interval: '1m',
      startDate: '2024-01-01T00:00:00.000Z',
      endDate: '2024-01-31T23:59:59.999Z',
      overwrite: false,
    });

    expect(marketDataRepositoryMock.hasData).toHaveBeenCalled();
    expect(downloadManagerMock.startImport).not.toHaveBeenCalled();
    expect(result).toEqual({
      jobId: 'already-imported',
      status: 'completed',
      filesQueued: 0,
      downloadedCount: 0,
      queuedPosition: null,
    });
  });

  it('delegates to download manager when import is needed', async () => {
    const useCase = new ImportBinanceDataUseCase(
      downloadManagerMock,
      marketDataRepositoryMock,
      loggerMock,
    );

    marketDataRepositoryMock.hasData.mockResolvedValue(false);
    downloadManagerMock.startImport.mockResolvedValue({
      jobId: 'job-42',
      status: 'pending',
      filesQueued: 2,
      downloadedCount: 0,
      queuedPosition: 1,
    });

    const result = await useCase.execute({
      symbol: 'BTCUSDT',
      interval: '1m',
      startDate: '2024-01-01T00:00:00.000Z',
      endDate: '2024-02-29T23:59:59.999Z',
      overwrite: false,
    });

    expect(downloadManagerMock.startImport).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: 'BTCUSDT',
        interval: '1m',
        overwrite: false,
      }),
    );
    expect(result).toEqual({
      jobId: 'job-42',
      status: 'pending',
      filesQueued: 2,
      downloadedCount: 0,
      queuedPosition: 1,
    });
  });
});
