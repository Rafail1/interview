import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
} from '@nestjs/common';
import * as amqp from 'amqplib';
import { IConnectionService } from '../interfaces/connection.service.interface';
import type { ILogger } from '../interfaces/logger.interface';
import { LOGGER_TOKEN } from '../interfaces/logger.interface';
import { ConfigService } from '@nestjs/config';
import { isErrorLike } from '../utils/type-guards';

@Injectable()
export class RabbitMQConnectionService
  implements IConnectionService, OnModuleInit, OnModuleDestroy
{
  private connection: amqp.ChannelModel;
  private channel: amqp.Channel;
  private readonly RABBITMQ_URL: string;

  constructor(
    @Inject(LOGGER_TOKEN) private readonly logger: ILogger,
    private readonly configService: ConfigService,
  ) {
    this.RABBITMQ_URL = this.configService.get<string>(
      'RABBITMQ_URL',
      'amqp://localhost',
    );
  }

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(this.RABBITMQ_URL);
      this.channel = await this.connection.createChannel();
      this.logger.log(
        'Successfully connected to RabbitMQ.',
        'RabbitMQConnectionService',
      );
    } catch (error) {
      if (isErrorLike(error)) {
        this.logger.error(
          'Failed to connect to RabbitMQ.',
          error.stack,
          'RabbitMQConnectionService',
        );
      }

      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    this.logger.log('Disconnected from RabbitMQ.', 'RabbitMQConnectionService');
  }

  getChannel(): amqp.Channel {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not available.');
    }
    return this.channel;
  }
}
