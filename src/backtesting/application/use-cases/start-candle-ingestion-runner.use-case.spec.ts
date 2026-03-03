import { StartCandleIngestionRunnerUseCase } from './start-candle-ingestion-runner.use-case';

describe('StartCandleIngestionRunnerUseCase', () => {
  it('resumes pending jobs via runner', async () => {
    const runnerMock = {
      resumePendingJobs: jest.fn().mockResolvedValue(7),
    };
    const useCase = new StartCandleIngestionRunnerUseCase(runnerMock as any);

    const result = await useCase.execute();
    expect(runnerMock.resumePendingJobs).toHaveBeenCalledWith();
    expect(result).toEqual({ resumedJobs: 7 });
  });
});
