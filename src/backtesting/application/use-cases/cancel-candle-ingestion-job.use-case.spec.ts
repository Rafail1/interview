import { CancelCandleIngestionJobUseCase } from './cancel-candle-ingestion-job.use-case';

describe('CancelCandleIngestionJobUseCase', () => {
  it('returns null when job not found', async () => {
    const repositoryMock = {
      requestCancel: jest.fn().mockResolvedValue(false),
      findById: jest.fn(),
    };
    const useCase = new CancelCandleIngestionJobUseCase(repositoryMock as any);

    const result = await useCase.execute('missing-job');
    expect(repositoryMock.requestCancel).toHaveBeenCalledWith('missing-job');
    expect(repositoryMock.findById).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('returns current job status when cancellation requested', async () => {
    const repositoryMock = {
      requestCancel: jest.fn().mockResolvedValue(true),
      findById: jest.fn().mockResolvedValue({
        id: 'ing-1',
        status: 'running',
      }),
    };
    const useCase = new CancelCandleIngestionJobUseCase(repositoryMock as any);

    const result = await useCase.execute('ing-1');
    expect(repositoryMock.findById).toHaveBeenCalledWith('ing-1');
    expect(result).toEqual({
      jobId: 'ing-1',
      status: 'running',
    });
  });
});
