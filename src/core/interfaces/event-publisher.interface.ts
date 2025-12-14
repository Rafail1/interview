export interface IEventPublisher {
  publishTaskCompletedEvent(taskId: string): Promise<void>;
}

export const EVENT_PUBLISHER_TOKEN = Symbol('IEventPublisher');
