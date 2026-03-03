import { GetCandleIngestionJobDetailsUseCase } from './get-candle-ingestion-job-details.use-case';

describe('GetCandleIngestionJobDetailsUseCase', () => {
  it('delegates to repository', async () => {
    const repositoryMock = {
      findDetailsById: jest.fn().mockResolvedValue({
        job: { id: 'ing-1' },
        symbolRunStats: { total: 0 },
      }),
    };
    const useCase = new GetCandleIngestionJobDetailsUseCase(
      repositoryMock as any,
    );

    const result = await useCase.execute('ing-1');
    expect(repositoryMock.findDetailsById).toHaveBeenCalledWith('ing-1');
    expect(result).toEqual({
      job: { id: 'ing-1' },
      symbolRunStats: { total: 0 },
    });
  });
});
