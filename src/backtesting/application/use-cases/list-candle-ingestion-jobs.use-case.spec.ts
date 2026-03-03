import { ListCandleIngestionJobsUseCase } from './list-candle-ingestion-jobs.use-case';

describe('ListCandleIngestionJobsUseCase', () => {
  it('applies defaults for page/limit/sort', async () => {
    const repositoryMock = {
      listJobs: jest.fn().mockResolvedValue({
        items: [],
        page: 1,
        limit: 20,
        total: 0,
      }),
    };
    const useCase = new ListCandleIngestionJobsUseCase(repositoryMock as any);

    await useCase.execute({ status: 'running' });

    expect(repositoryMock.listJobs).toHaveBeenCalledWith({
      sortBy: 'createdAt',
      sortOrder: 'desc',
      status: 'running',
      mode: undefined,
      interval: undefined,
      fromDate: undefined,
      toDate: undefined,
      page: 1,
      limit: 20,
    });
  });

  it('throws when fromDate is after toDate', async () => {
    const repositoryMock = { listJobs: jest.fn() };
    const useCase = new ListCandleIngestionJobsUseCase(repositoryMock as any);

    await expect(
      useCase.execute({
        fromDate: '2026-03-03T00:00:00.000Z',
        toDate: '2026-03-01T00:00:00.000Z',
      }),
    ).rejects.toThrow('fromDate must be before or equal to toDate');

    expect(repositoryMock.listJobs).not.toHaveBeenCalled();
  });
});
