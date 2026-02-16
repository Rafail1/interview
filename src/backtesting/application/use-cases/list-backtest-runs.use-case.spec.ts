import { ListBacktestRunsUseCase } from './list-backtest-runs.use-case';

describe('ListBacktestRunsUseCase', () => {
  it('applies default pagination when page/limit are missing', async () => {
    const repositoryMock = {
      listRuns: jest.fn().mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 }),
    };

    const useCase = new ListBacktestRunsUseCase(repositoryMock as any);

    await useCase.execute({ symbol: 'BTCUSDT' });

    expect(repositoryMock.listRuns).toHaveBeenCalledWith({
      sortBy: 'createdAt',
      sortOrder: 'desc',
      symbol: 'BTCUSDT',
      interval: undefined,
      fromDate: undefined,
      toDate: undefined,
      page: 1,
      limit: 20,
    });
  });

  it('throws when fromDate is after toDate', async () => {
    const repositoryMock = {
      listRuns: jest.fn(),
    };

    const useCase = new ListBacktestRunsUseCase(repositoryMock as any);

    await expect(
      useCase.execute({
        fromDate: '2024-02-01T00:00:00.000Z',
        toDate: '2024-01-01T00:00:00.000Z',
      }),
    ).rejects.toThrow('fromDate must be before or equal to toDate');

    expect(repositoryMock.listRuns).not.toHaveBeenCalled();
  });

  it('passes explicit sort options through to repository', async () => {
    const repositoryMock = {
      listRuns: jest.fn().mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 }),
    };

    const useCase = new ListBacktestRunsUseCase(repositoryMock as any);

    await useCase.execute({
      sortBy: 'winRate',
      sortOrder: 'asc',
      page: 1,
      limit: 5,
    });

    expect(repositoryMock.listRuns).toHaveBeenCalledWith({
      sortBy: 'winRate',
      sortOrder: 'asc',
      symbol: undefined,
      interval: undefined,
      fromDate: undefined,
      toDate: undefined,
      page: 1,
      limit: 5,
    });
  });
});
