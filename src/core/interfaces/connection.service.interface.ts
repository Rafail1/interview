import { Channel } from 'amqplib';

export interface IConnectionService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getChannel(): Channel;
}

export const CONNECTION_SERVICE_TOKEN = Symbol('IConnectionService');
