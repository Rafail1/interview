import { GetBacktestRunEquityUseCase } from './get-backtest-run-equity.use-case';

describe('GetBacktestRunEquityUseCase', () => {
  it('applies defaults and forwards parsed filter values', async () => {
    const repositoryMock = {
      findEquityByRunId: jest.fn().mockResolvedValue(null),
    };
    const useCase = new GetBacktestRunEquityUseCase(repositoryMock as any);

    await useCase.execute('run-1', {});

    expect(repositoryMock.findEquityByRunId).toHaveBeenCalledWith({
      runId: 'run-1',
      limit: 100,
      fromTs: undefined,
      toTs: undefined,
      cursorTs: undefined,
      cursorId: undefined,
    });
  });

  it('uses explicit pagination and timestamp bounds', async () => {
    const repositoryMock = {
      findEquityByRunId: jest.fn().mockResolvedValue(null),
    };
    const useCase = new GetBacktestRunEquityUseCase(repositoryMock as any);

    await useCase.execute('run-2', {
      limit: 25,
      fromTs: '1704067200000',
      toTs: '1704067319999',
    });

    expect(repositoryMock.findEquityByRunId).toHaveBeenCalledWith({
      runId: 'run-2',
      limit: 25,
      fromTs: 1704067200000n,
      toTs: 1704067319999n,
      cursorTs: undefined,
      cursorId: undefined,
    });
  });

  it('parses cursor and forwards cursor fields', async () => {
    const repositoryMock = {
      findEquityByRunId: jest.fn().mockResolvedValue(null),
    };
    const useCase = new GetBacktestRunEquityUseCase(repositoryMock as any);

    await useCase.execute('run-2', {
      cursor: '1704067200000:5d951645-7b12-4af4-8f5d-0f7d2782d8ba',
    });

    expect(repositoryMock.findEquityByRunId).toHaveBeenCalledWith({
      runId: 'run-2',
      limit: 100,
      fromTs: undefined,
      toTs: undefined,
      cursorTs: 1704067200000n,
      cursorId: '5d951645-7b12-4af4-8f5d-0f7d2782d8ba',
    });
  });

  it('throws when fromTs is greater than toTs', async () => {
    const repositoryMock = {
      findEquityByRunId: jest.fn(),
    };
    const useCase = new GetBacktestRunEquityUseCase(repositoryMock as any);

    await expect(
      useCase.execute('run-3', {
        fromTs: '200',
        toTs: '100',
      }),
    ).rejects.toThrow('fromTs must be before or equal to toTs');

    expect(repositoryMock.findEquityByRunId).not.toHaveBeenCalled();
  });
});
