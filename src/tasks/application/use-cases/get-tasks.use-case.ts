import { Inject, Injectable } from '@nestjs/common';
import {
  TASK_REPOSITORY_TOKEN,
  type ITaskRepository,
} from '../../domain/interfaces/task.repository.interface';
import { Task } from '../../domain/entities/task.entity';
import {
  LOGGER_TOKEN,
  type ILogger,
} from '../../../core/interfaces/logger.interface';

@Injectable()
export class GetTasksUseCase {
  constructor(
    @Inject(TASK_REPOSITORY_TOKEN)
    private readonly taskRepository: ITaskRepository,
    @Inject(LOGGER_TOKEN) private readonly logger: ILogger,
  ) {}

  async execute(): Promise<Task[]> {
    this.logger.debug('Executing GetTasksUseCase', GetTasksUseCase.name);

    const tasks = await this.taskRepository.findAll();

    this.logger.log(`Fetched ${tasks.length} tasks`, GetTasksUseCase.name);

    return tasks;
  }
}
