import { StartCandleIngestionJobUseCase } from './start-candle-ingestion-job.use-case';

describe('StartCandleIngestionJobUseCase', () => {
  it('creates job and returns envelope', async () => {
    const repositoryMock = {
      createJob: jest.fn().mockResolvedValue({
        id: 'ing-1',
        configHash: 'hash-1',
      }),
    };
    const runnerMock = { enqueue: jest.fn() };
    const useCase = new StartCandleIngestionJobUseCase(
      repositoryMock as any,
      runnerMock as any,
    );

    const result = await useCase.execute({
      mode: 'incremental',
      interval: '4h',
    });

    expect(repositoryMock.createJob).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'incremental',
        interval: '4h',
        backfillCandles: 1000,
      }),
    );
    expect(result).toEqual({
      jobId: 'ing-1',
      status: 'pending',
      configHash: 'hash-1',
    });
    expect(runnerMock.enqueue).toHaveBeenCalledWith('ing-1');
  });

  it('throws on invalid timeframe', async () => {
    const repositoryMock = {
      createJob: jest.fn(),
    };
    const useCase = new StartCandleIngestionJobUseCase(
      repositoryMock as any,
      { enqueue: jest.fn() } as any,
    );

    await expect(
      useCase.execute({
        mode: 'incremental',
        interval: '7m',
      } as any),
    ).rejects.toThrow('Invalid timeframe: 7m');
    expect(repositoryMock.createJob).not.toHaveBeenCalled();
  });
});
