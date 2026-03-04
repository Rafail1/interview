import { StartInPlayRunUseCase } from './start-in-play-run.use-case';

describe('StartInPlayRunUseCase', () => {
  it('creates run and enqueues processing', async () => {
    const repositoryMock = {
      createRun: jest.fn().mockResolvedValue({
        id: 'inplay-1',
        status: 'pending',
      }),
    };
    const runnerMock = { enqueue: jest.fn() };
    const useCase = new StartInPlayRunUseCase(
      repositoryMock as any,
      runnerMock as any,
    );

    const result = await useCase.execute({
      interval: '15m',
      startDate: '2026-02-01T00:00:00.000Z',
      endDate: '2026-02-28T23:59:59.999Z',
    });

    expect(repositoryMock.createRun).toHaveBeenCalled();
    expect(runnerMock.enqueue).toHaveBeenCalledWith('inplay-1');
    expect(result).toEqual({
      runId: 'inplay-1',
      status: 'pending',
    });
  });
});
