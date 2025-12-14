type PriorityValue = 'LOW' | 'MEDIUM' | 'HIGH';

export class Priority {
  private constructor(private readonly value: PriorityValue) {}

  public static low(): Priority {
    return new Priority('LOW');
  }
  public static medium(): Priority {
    return new Priority('MEDIUM');
  }
  public static high(): Priority {
    return new Priority('HIGH');
  }

  public static fromValue(value: string): Priority {
    if (!['LOW', 'MEDIUM', 'HIGH'].includes(value)) {
      throw new Error(`Invalid Priority value: ${value}`);
    }
    return new Priority(value as PriorityValue);
  }

  public isHigh(): boolean {
    return this.value === 'HIGH';
  }

  public toString(): string {
    return this.value;
  }

  public equals(other: Priority): boolean {
    return other.value === this.value;
  }
}
