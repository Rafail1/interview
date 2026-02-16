import { GetImportJobStatusUseCase } from './get-import-job-status.use-case';

describe('GetImportJobStatusUseCase', () => {
  it('delegates status lookup to download manager', async () => {
    const downloadManagerMock = {
      getJobStatus: jest.fn().mockResolvedValue({
        jobId: 'job-1',
        status: 'pending',
        queuedPosition: 1,
      }),
    } as any;

    const useCase = new GetImportJobStatusUseCase(downloadManagerMock);
    const result = await useCase.execute('job-1');

    expect(downloadManagerMock.getJobStatus).toHaveBeenCalledWith('job-1');
    expect(result).toEqual({
      jobId: 'job-1',
      status: 'pending',
      queuedPosition: 1,
    });
  });
});
