import { Task } from '../entities/task.entity';

export interface ITaskRepository {
  findById(id: string): Promise<Task | null>;
  save(task: Task): Promise<void>;
  findAll(): Promise<Task[]>;
}

export const TASK_REPOSITORY_TOKEN = Symbol('ITaskRepository');
