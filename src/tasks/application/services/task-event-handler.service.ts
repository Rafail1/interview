import { Injectable, Inject } from '@nestjs/common';
import {
  type ILogger,
  LOGGER_TOKEN,
} from '../../../core/interfaces/logger.interface';
import { ITaskEventHandler } from '../../../core/interfaces/task-event-handler.interface';

@Injectable()
export class TaskEventHandlerService implements ITaskEventHandler {
  constructor(@Inject(LOGGER_TOKEN) private readonly logger: ILogger) {}

  async handleTaskCompleted(taskId: string): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        this.logger.log(
          `[App Service] Processing 'TaskCompleted' event for ID: ${taskId}`,
        );

        return resolve();
      }, 1000);
    });
  }
}
