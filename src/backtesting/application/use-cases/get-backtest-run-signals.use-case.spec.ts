import { GetBacktestRunSignalsUseCase } from './get-backtest-run-signals.use-case';

describe('GetBacktestRunSignalsUseCase', () => {
  it('applies defaults and forwards parsed filter values', async () => {
    const repositoryMock = {
      findSignalsByRunId: jest.fn().mockResolvedValue(null),
    };
    const useCase = new GetBacktestRunSignalsUseCase(repositoryMock as any);

    await useCase.execute('run-1', {});

    expect(repositoryMock.findSignalsByRunId).toHaveBeenCalledWith({
      runId: 'run-1',
      page: 1,
      limit: 100,
      fromTs: undefined,
      toTs: undefined,
    });
  });

  it('uses explicit pagination and timestamp bounds', async () => {
    const repositoryMock = {
      findSignalsByRunId: jest.fn().mockResolvedValue(null),
    };
    const useCase = new GetBacktestRunSignalsUseCase(repositoryMock as any);

    await useCase.execute('run-2', {
      page: 2,
      limit: 50,
      fromTs: '1704067200000',
      toTs: '1704067319999',
    });

    expect(repositoryMock.findSignalsByRunId).toHaveBeenCalledWith({
      runId: 'run-2',
      page: 2,
      limit: 50,
      fromTs: 1704067200000n,
      toTs: 1704067319999n,
    });
  });

  it('throws when fromTs is greater than toTs', async () => {
    const repositoryMock = {
      findSignalsByRunId: jest.fn(),
    };
    const useCase = new GetBacktestRunSignalsUseCase(repositoryMock as any);

    await expect(
      useCase.execute('run-3', {
        fromTs: '200',
        toTs: '100',
      }),
    ).rejects.toThrow('fromTs must be before or equal to toTs');

    expect(repositoryMock.findSignalsByRunId).not.toHaveBeenCalled();
  });
});
