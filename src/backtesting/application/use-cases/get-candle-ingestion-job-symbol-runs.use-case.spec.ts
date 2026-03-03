import { GetCandleIngestionJobSymbolRunsUseCase } from './get-candle-ingestion-job-symbol-runs.use-case';

describe('GetCandleIngestionJobSymbolRunsUseCase', () => {
  it('delegates to repository', async () => {
    const repositoryMock = {
      findSymbolRunsByJobId: jest.fn().mockResolvedValue([{ id: 'run-1' }]),
    };
    const useCase = new GetCandleIngestionJobSymbolRunsUseCase(
      repositoryMock as any,
    );

    const result = await useCase.execute('ing-1');
    expect(repositoryMock.findSymbolRunsByJobId).toHaveBeenCalledWith('ing-1');
    expect(result).toEqual([{ id: 'run-1' }]);
  });
});
