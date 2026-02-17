import { ListActiveBacktestRunsUseCase } from './list-active-backtest-runs.use-case';

describe('ListActiveBacktestRunsUseCase', () => {
  it('returns active runs from repository', async () => {
    const repositoryMock = {
      listActiveRuns: jest.fn().mockResolvedValue([
        { id: 'run-1', status: 'running' },
      ]),
    };
    const useCase = new ListActiveBacktestRunsUseCase(repositoryMock as any);

    const result = await useCase.execute();

    expect(repositoryMock.listActiveRuns).toHaveBeenCalled();
    expect(result).toEqual({
      items: [{ id: 'run-1', status: 'running' }],
    });
  });
});
