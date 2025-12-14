export interface IEventConsumerService {
  startConsuming(): Promise<void>;
  handleMessage(messageContent: any): Promise<void>;
}

export const EVENT_CONSUMER_TOKEN = Symbol('IEventConsumerService');
