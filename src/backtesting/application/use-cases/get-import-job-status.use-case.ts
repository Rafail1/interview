import { Inject, Injectable } from '@nestjs/common';
import {
  DOWNLOAD_MANAGER_TOKEN,
  type IDownloadManager,
} from 'src/backtesting/domain/interfaces/download-manager.interface';

@Injectable()
export class GetImportJobStatusUseCase {
  constructor(
    @Inject(DOWNLOAD_MANAGER_TOKEN)
    private readonly downloadManager: IDownloadManager,
  ) {}

  public async execute(jobId: string) {
    return this.downloadManager.getJobStatus(jobId);
  }
}
