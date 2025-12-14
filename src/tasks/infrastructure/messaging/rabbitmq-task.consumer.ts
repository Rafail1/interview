import { Injectable, Inject, OnApplicationBootstrap } from '@nestjs/common';
import * as amqp from 'amqplib';
import {
  type IConnectionService,
  CONNECTION_SERVICE_TOKEN,
} from '../../../core/interfaces/connection.service.interface';
import {
  type ILogger,
  LOGGER_TOKEN,
} from 'src/core/interfaces/logger.interface';
import {
  type ITaskEventHandler,
  TASK_EVENT_HANDLER_TOKEN,
} from 'src/core/interfaces/task-event-handler.interface';
import { ConfigService } from '@nestjs/config';
import { isErrorLike, isEventLike } from 'src/core/utils/type-guards';

@Injectable()
export class RabbitMQTaskConsumer implements OnApplicationBootstrap {
  private readonly exchange: string;
  private readonly queue: string;

  constructor(
    private readonly configService: ConfigService,
    @Inject(CONNECTION_SERVICE_TOKEN)
    private readonly connectionService: IConnectionService,
    @Inject(TASK_EVENT_HANDLER_TOKEN)
    private readonly taskEventHandler: ITaskEventHandler,
    @Inject(LOGGER_TOKEN) private readonly logger: ILogger,
  ) {
    this.exchange = this.configService.get<string>(
      'RABBITMQ_TASK_EXCHANGE',
      'RABBITMQ_TASK_EXCHANGE',
    );
    this.queue = this.configService.get<string>(
      'RABBITMQ_TASK_QUEUE_LOG',
      'RABBITMQ_TASK_QUEUE_LOG',
    );
  }

  async onApplicationBootstrap() {
    await this.connectionService.connect();
    await this.startConsuming();
  }

  private async startConsuming(): Promise<void> {
    try {
      const channel = this.connectionService.getChannel();

      await channel.assertExchange(this.exchange, 'fanout', { durable: true });

      const q = await channel.assertQueue(this.queue, { durable: true });
      await channel.bindQueue(q.queue, this.exchange, '');

      this.logger.log(
        `Waiting for messages in queue: ${q.queue}`,
        'TaskEventConsumer',
      );

      void channel.consume(
        q.queue,
        (msg) => {
          if (msg) {
            void this.handleMessage(msg);
          }
        },
        {
          noAck: false,
        },
      );
    } catch (error) {
      if (isErrorLike(error)) {
        this.logger.error(
          `Error during RabbitMQ consumption setup: ${error.message}`,
          error.stack,
          'TaskEventConsumer',
        );
      } else {
        console.error('An unhandled non-error value was thrown');
      }
    }
  }

  private async handleMessage(msg: amqp.ConsumeMessage): Promise<void> {
    const content: unknown = JSON.parse(msg.content.toString());
    if (isEventLike(content) && content.eventType === 'TaskCompleted') {
      await this.taskEventHandler.handleTaskCompleted(content.taskId);
    }

    this.connectionService.getChannel().ack(msg);
  }
}
