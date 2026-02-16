import { Injectable } from '@nestjs/common';
import { Task } from 'src/tasks/domain/entities/task.entity';
import { TaskStatus } from 'src/tasks/domain/value-objects/task-status.value-object';
import { Priority } from 'src/tasks/domain/value-objects/priority.value-object';

/**
 * Maps between domain Task entity and persistence layer data.
 * Maintains abstraction from ORM implementation to enable easy migration.
 */
@Injectable()
export class TaskMapper {
  /**
   * Converts persistence layer record to domain entity
   */
  public toDomain(record: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
  }): Task {
    const task = Task.create(
      record.id,
      record.title,
      record.description,
      TaskStatus.fromValue(record.status),
      Priority.fromValue(record.priority),
    );

    return task;
  }

  /**
   * Converts domain entity to persistence layer format
   * Returns plain object compatible with any ORM (Prisma, TypeORM, Sequelize, etc.)
   */
  public toPersistence(domainTask: Task): {
    title: string;
    description: string | null;
    status: string;
    priority: string;
  } {
    return {
      title: domainTask.getTitle(),
      description: domainTask.getDescription() ?? null,
      status: domainTask.getStatus().toString(),
      priority: domainTask.getPriority().toString(),
    };
  }
}
