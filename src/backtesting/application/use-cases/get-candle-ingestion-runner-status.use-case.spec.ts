import { GetCandleIngestionRunnerStatusUseCase } from './get-candle-ingestion-runner-status.use-case';

describe('GetCandleIngestionRunnerStatusUseCase', () => {
  it('returns runner status', () => {
    const runnerMock = {
      getStatus: jest.fn().mockReturnValue({
        queuedJobs: 2,
        runningJobs: 1,
        maxConcurrentJobs: 1,
        maxConcurrentSymbols: 6,
        maxApiConcurrency: 8,
        apiInFlight: 3,
      }),
    };
    const useCase = new GetCandleIngestionRunnerStatusUseCase(runnerMock as any);

    const result = useCase.execute();
    expect(runnerMock.getStatus).toHaveBeenCalled();
    expect(result).toEqual({
      queuedJobs: 2,
      runningJobs: 1,
      maxConcurrentJobs: 1,
      maxConcurrentSymbols: 6,
      maxApiConcurrency: 8,
      apiInFlight: 3,
    });
  });
});
