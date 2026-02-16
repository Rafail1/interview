import { Inject, Injectable } from '@nestjs/common';
import {
  TASK_REPOSITORY_TOKEN,
  type ITaskRepository,
} from 'src/tasks/domain/interfaces/task.repository.interface';
import { Task } from 'src/tasks/domain/entities/task.entity';
import { CreateTaskDto } from 'src/tasks/interfaces/dtos/task.dto';
import { randomUUID } from 'crypto';
import {
  LOGGER_TOKEN,
  type ILogger,
} from 'src/core/interfaces/logger.interface';
import { TaskStatus } from 'src/tasks/domain/value-objects/task-status.value-object';
import { Priority } from 'src/tasks/domain/value-objects/priority.value-object';

@Injectable()
export class CreateTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY_TOKEN)
    private readonly taskRepository: ITaskRepository,
    @Inject(LOGGER_TOKEN) private readonly logger: ILogger,
  ) {}

  async execute(command: CreateTaskDto): Promise<string> {
    this.logger.debug(
      `Executing CreateTaskUseCase with title: ${command.title}`,
      CreateTaskUseCase.name,
    );

    const newTask = Task.create(
      randomUUID(),
      command.title,
      command.description,
      TaskStatus.fromValue('OPEN'),
      Priority.fromValue(command.priority ?? 'MEDIUM'),
    );

    await this.taskRepository.save(newTask);

    this.logger.log(
      `Task ${newTask.getId()} created successfully`,
      CreateTaskUseCase.name,
    );

    return newTask.getId();
  }
}
