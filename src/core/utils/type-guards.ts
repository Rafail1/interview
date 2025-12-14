export function isErrorLike(
  value: unknown,
): value is { message: string; stack: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    'stack' in value &&
    typeof (value as { message: unknown; stack: unknown }).message ===
      'string' &&
    typeof (value as { message: unknown; stack: unknown }).stack === 'string'
  );
}

export function isEventLike(value: unknown): value is {
  eventType: string;
  taskId: string;
  timestamp: string;
} {
  if (
    typeof value === 'object' &&
    value !== null &&
    'eventType' in value &&
    'taskId' in value &&
    'timestamp' in value
  ) {
    const v = value as {
      eventType: unknown;
      taskId: unknown;
      timestamp: unknown;
    };
    return (
      typeof v.eventType === 'string' &&
      typeof v.taskId === 'string' &&
      typeof v.timestamp === 'string'
    );
  }
  return false;
}
