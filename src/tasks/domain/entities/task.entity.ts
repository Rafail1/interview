import { TaskStatus } from '../value-objects/task-status.value-object';
import { Priority } from '../value-objects/priority.value-object';

export class Task {
  private constructor(
    private readonly id: string,
    private title: string,
    private description: string | null,
    private status: TaskStatus,
    private priority: Priority,
    private readonly createdAt: Date = new Date(),
  ) {}

  public static create(
    id: string,
    title: string,
    description: string | null = null,
    status?: TaskStatus,
    priority?: Priority,
  ): Task {
    return new Task(
      id,
      title,
      description,
      status || TaskStatus.open(),
      priority || Priority.medium(),
    );
  }

  public complete(): void {
    if (this.status.isCompleted()) {
      throw new Error('Cannot complete a task that is already completed.');
    }
    this.status = TaskStatus.completed();
  }

  public getId(): string {
    return this.id;
  }
  public getTitle(): string {
    return this.title;
  }

  public getStatus(): TaskStatus {
    return this.status;
  }
  public getPriority(): Priority {
    return this.priority;
  }
  public getCreatedAt(): Date {
    return this.createdAt;
  }

  public updateDescription(newDescription: string | null): void {
    this.description = newDescription;
  }

  public getDescription(): string | null {
    return this.description;
  }
}
