import { CancelBacktestRunUseCase } from './cancel-backtest-run.use-case';

describe('CancelBacktestRunUseCase', () => {
  it('returns cancelled status when run exists', async () => {
    const repositoryMock = {
      cancelRun: jest.fn().mockResolvedValue(true),
      findById: jest.fn().mockResolvedValue({ status: 'cancelled' }),
    };
    const useCase = new CancelBacktestRunUseCase(repositoryMock as any);

    const result = await useCase.execute('run-1');

    expect(repositoryMock.cancelRun).toHaveBeenCalledWith('run-1');
    expect(repositoryMock.findById).toHaveBeenCalledWith('run-1');
    expect(result).toEqual({
      runId: 'run-1',
      status: 'cancelled',
    });
  });

  it('returns null when run is missing', async () => {
    const repositoryMock = {
      cancelRun: jest.fn().mockResolvedValue(false),
      findById: jest.fn(),
    };
    const useCase = new CancelBacktestRunUseCase(repositoryMock as any);

    await expect(useCase.execute('missing')).resolves.toBeNull();
    expect(repositoryMock.findById).not.toHaveBeenCalled();
  });
});
