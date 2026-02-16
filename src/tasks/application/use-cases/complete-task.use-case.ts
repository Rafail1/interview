import { Inject, Injectable } from '@nestjs/common';
import {
  TASK_REPOSITORY_TOKEN,
  type ITaskRepository,
} from 'src/tasks/domain/interfaces/task.repository.interface';
import {
  NotFoundAppException,
  ConflictAppException,
} from 'src/core/exceptions/index';
import {
  EVENT_PUBLISHER_TOKEN,
  type IEventPublisher,
} from 'src/core/interfaces/event-publisher.interface';
import { isErrorLike } from 'src/core/utils/type-guards';

interface CompleteTaskCommand {
  taskId: string;
}

@Injectable()
export class CompleteTaskUseCase {
  constructor(
    @Inject(TASK_REPOSITORY_TOKEN)
    private readonly taskRepository: ITaskRepository,
    @Inject(EVENT_PUBLISHER_TOKEN)
    private readonly eventPublisher: IEventPublisher,
  ) {}

  async execute(command: CompleteTaskCommand): Promise<void> {
    const task = await this.taskRepository.findById(command.taskId);

    if (!task) {
      throw new NotFoundAppException(
        `Task not found with ID: ${command.taskId}`,
      );
    }

    try {
      task.complete();
    } catch (e) {
      if (isErrorLike(e)) {
        throw new ConflictAppException(e.message);
      }
    }

    await this.taskRepository.save(task);
    await this.eventPublisher.publishTaskCompletedEvent(task.getId());
  }
}
