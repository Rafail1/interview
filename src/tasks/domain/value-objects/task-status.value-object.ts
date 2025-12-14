type StatusValue = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';

export class TaskStatus {
  private constructor(private readonly value: StatusValue) {}

  public static open(): TaskStatus {
    return new TaskStatus('OPEN');
  }
  public static inProgress(): TaskStatus {
    return new TaskStatus('IN_PROGRESS');
  }
  public static completed(): TaskStatus {
    return new TaskStatus('COMPLETED');
  }

  public static fromValue(value: string): TaskStatus {
    if (!['OPEN', 'IN_PROGRESS', 'COMPLETED'].includes(value)) {
      throw new Error(`Invalid TaskStatus value: ${value}`);
    }
    return new TaskStatus(value as StatusValue);
  }

  public isCompleted(): boolean {
    return this.value === 'COMPLETED';
  }

  public toString(): string {
    return this.value;
  }

  public equals(other: TaskStatus): boolean {
    return other.value === this.value;
  }
}
