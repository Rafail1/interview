import { GetCandleIngestionJobStatusUseCase } from './get-candle-ingestion-job-status.use-case';

describe('GetCandleIngestionJobStatusUseCase', () => {
  it('delegates to repository', async () => {
    const repositoryMock = {
      findById: jest.fn().mockResolvedValue({
        id: 'ing-1',
      }),
    };
    const useCase = new GetCandleIngestionJobStatusUseCase(
      repositoryMock as any,
    );

    const result = await useCase.execute('ing-1');
    expect(repositoryMock.findById).toHaveBeenCalledWith('ing-1');
    expect(result).toEqual({ id: 'ing-1' });
  });
});
