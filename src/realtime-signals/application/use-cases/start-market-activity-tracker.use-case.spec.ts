import { StartMarketActivityTrackerUseCase } from './start-market-activity-tracker.use-case';

describe('StartMarketActivityTrackerUseCase', () => {
  it('starts market activity tracker', async () => {
    const trackerMock = {
      start: jest.fn().mockResolvedValue({
        started: true,
        symbolsTracked: 420,
      }),
    };
    const useCase = new StartMarketActivityTrackerUseCase(trackerMock as any);

    const result = await useCase.execute();
    expect(trackerMock.start).toHaveBeenCalled();
    expect(result).toEqual({
      started: true,
      symbolsTracked: 420,
    });
  });
});
