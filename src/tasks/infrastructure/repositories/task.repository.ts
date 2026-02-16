import { Injectable } from '@nestjs/common';
import { ITaskRepository } from 'src/tasks/domain/interfaces/task.repository.interface';
import { Task } from 'src/tasks/domain/entities/task.entity';
import { TaskMapper } from '../mappers/task.mapper';
import { PrismaService } from 'src/core/infrastructure/prisma.service';

/**
 * Task Repository implementation using Prisma.
 * Uses abstracted mapper interface to remain ORM-agnostic at the domain level.
 */
@Injectable()
export class TaskRepository implements ITaskRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taskMapper: TaskMapper,
  ) {}

  async findById(id: string): Promise<Task | null> {
    const taskRecord = await this.prisma.task.findUnique({
      where: { id },
    });

    return taskRecord ? this.taskMapper.toDomain(taskRecord) : null;
  }

  async findAll(): Promise<Task[]> {
    const taskRecords = await this.prisma.task.findMany();
    return taskRecords.map((record) => this.taskMapper.toDomain(record));
  }

  async save(task: Task): Promise<void> {
    const data = this.taskMapper.toPersistence(task);

    await this.prisma.task.upsert({
      where: { id: task.getId() },
      update: data,
      create: { id: task.getId(), ...data },
    });
  }
}
