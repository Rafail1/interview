import { GetInPlayRunStatusUseCase } from './get-in-play-run-status.use-case';

describe('GetInPlayRunStatusUseCase', () => {
  it('delegates to repository', async () => {
    const repositoryMock = {
      findRunById: jest.fn().mockResolvedValue({ id: 'inplay-1' }),
    };
    const useCase = new GetInPlayRunStatusUseCase(repositoryMock as any);
    const result = await useCase.execute('inplay-1');
    expect(repositoryMock.findRunById).toHaveBeenCalledWith('inplay-1');
    expect(result).toEqual({ id: 'inplay-1' });
  });
});
