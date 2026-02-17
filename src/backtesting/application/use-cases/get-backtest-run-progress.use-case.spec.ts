import { GetBacktestRunProgressUseCase } from './get-backtest-run-progress.use-case';

describe('GetBacktestRunProgressUseCase', () => {
  it('maps run view to progress payload', async () => {
    const repositoryMock = {
      findById: jest.fn().mockResolvedValue({
        id: 'run-1',
        status: 'running',
        errorMessage: null,
        processedCandles: 100,
        generatedSignals: 3,
        startTime: '1704067200000',
        endTime: '1706745599000',
        cancelRequestedAt: null,
        createdAt: new Date('2024-02-01T00:00:00.000Z'),
        updatedAt: new Date('2024-02-01T00:05:00.000Z'),
      }),
    };

    const useCase = new GetBacktestRunProgressUseCase(repositoryMock as any);
    const result = await useCase.execute('run-1');

    expect(repositoryMock.findById).toHaveBeenCalledWith('run-1');
    expect(result).toEqual(
      expect.objectContaining({
        runId: 'run-1',
        status: 'running',
        processedCandles: 100,
        generatedSignals: 3,
      }),
    );
  });

  it('returns null when run does not exist', async () => {
    const repositoryMock = {
      findById: jest.fn().mockResolvedValue(null),
    };

    const useCase = new GetBacktestRunProgressUseCase(repositoryMock as any);
    await expect(useCase.execute('missing')).resolves.toBeNull();
  });
});
