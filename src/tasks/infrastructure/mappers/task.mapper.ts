import { Injectable } from '@nestjs/common';
import { TaskEntityOrm } from '../entities/task-orm.entity';
import { Task } from '../../domain/entities/task.entity';
import { TaskStatus } from '../../domain/value-objects/task-status.value-object';
import { Priority } from '../../domain/value-objects/priority.value-object';

@Injectable()
export class TaskMapper {
  public toDomain(ormEntity: TaskEntityOrm): Task {
    const task = Task.create(
      ormEntity.id,
      ormEntity.title,
      ormEntity.description,
      TaskStatus.fromValue(ormEntity.status),
      Priority.fromValue(ormEntity.priority),
    );

    return task;
  }

  public toOrmEntity(domainTask: Task): TaskEntityOrm {
    const ormEntity = new TaskEntityOrm();

    ormEntity.id = domainTask.getId();
    ormEntity.title = domainTask.getTitle();
    ormEntity.description = domainTask.getDescription() ?? null;
    ormEntity.status = domainTask.getStatus().toString();
    ormEntity.priority = domainTask.getPriority().toString();

    return ormEntity;
  }
}
