import { ListInPlayRangesUseCase } from './list-in-play-ranges.use-case';

describe('ListInPlayRangesUseCase', () => {
  it('returns ranges for run', async () => {
    const repositoryMock = {
      listRanges: jest.fn().mockResolvedValue([
        {
          id: 'range-1',
          symbol: 'BTCUSDT',
        },
      ]),
    };
    const useCase = new ListInPlayRangesUseCase(repositoryMock as any);

    const result = await useCase.execute('inplay-1', { symbol: 'btcusdt' });
    expect(repositoryMock.listRanges).toHaveBeenCalledWith(
      'inplay-1',
      'BTCUSDT',
    );
    expect(result).toEqual({
      runId: 'inplay-1',
      items: [{ id: 'range-1', symbol: 'BTCUSDT' }],
    });
  });
});
