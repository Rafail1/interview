import { GetMarketActivityTrackerStatusUseCase } from './get-market-activity-tracker-status.use-case';

describe('GetMarketActivityTrackerStatusUseCase', () => {
  it('returns tracker status', () => {
    const trackerMock = {
      getStatus: jest.fn().mockReturnValue({
        started: true,
        starting: false,
        trackedSymbols: 500,
        activeSymbols: 42,
        sockets: 3,
      }),
    };
    const useCase = new GetMarketActivityTrackerStatusUseCase(trackerMock as any);

    const result = useCase.execute();
    expect(trackerMock.getStatus).toHaveBeenCalled();
    expect(result).toEqual({
      started: true,
      starting: false,
      trackedSymbols: 500,
      activeSymbols: 42,
      sockets: 3,
    });
  });
});
