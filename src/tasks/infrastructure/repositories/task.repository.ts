import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ITaskRepository } from '../../domain/interfaces/task.repository.interface';
import { Task } from '../../domain/entities/task.entity';
import { TaskEntityOrm } from '../entities/task-orm.entity';
import { TaskMapper } from '../mappers/task.mapper';

@Injectable()
export class TaskRepository implements ITaskRepository {
  constructor(
    @InjectRepository(TaskEntityOrm)
    private readonly ormRepository: Repository<TaskEntityOrm>,
    private readonly taskMapper: TaskMapper,
  ) {}

  async findById(id: string): Promise<Task | null> {
    const ormTask = await this.ormRepository.findOne({ where: { id } });

    return ormTask ? this.taskMapper.toDomain(ormTask) : null;
  }

  async findAll(): Promise<Task[]> {
    const ormTasks = await this.ormRepository.find();
    return ormTasks.map((t) => this.taskMapper.toDomain(t));
  }

  async save(task: Task): Promise<void> {
    const ormEntity = this.taskMapper.toOrmEntity(task);

    await this.ormRepository.save(ormEntity);
  }
}
