import { GetImportQueueOverviewUseCase } from './get-import-queue-overview.use-case';

describe('GetImportQueueOverviewUseCase', () => {
  it('delegates queue overview to download manager', () => {
    const downloadManagerMock = {
      getQueueOverview: jest.fn().mockReturnValue({
        queueSize: 2,
        activeImports: 1,
        maxConcurrentImports: 2,
        queuedJobs: [
          {
            jobId: 'job-2',
            symbol: 'ETHUSDT',
            interval: '1m',
            queuedPosition: 1,
          },
        ],
      }),
    } as any;

    const useCase = new GetImportQueueOverviewUseCase(downloadManagerMock);
    const result = useCase.execute();

    expect(downloadManagerMock.getQueueOverview).toHaveBeenCalled();
    expect(result).toEqual({
      queueSize: 2,
      activeImports: 1,
      maxConcurrentImports: 2,
      queuedJobs: [
        {
          jobId: 'job-2',
          symbol: 'ETHUSDT',
          interval: '1m',
          queuedPosition: 1,
        },
      ],
    });
  });
});
