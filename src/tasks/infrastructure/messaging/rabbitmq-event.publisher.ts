import { Injectable, Inject } from '@nestjs/common';
import {
  type ILogger,
  LOGGER_TOKEN,
} from 'src/core/interfaces/logger.interface';
import { IEventPublisher } from 'src/core/interfaces/event-publisher.interface';
import {
  type IConnectionService,
  CONNECTION_SERVICE_TOKEN,
} from 'src/core/interfaces/connection.service.interface';
import { ConfigService } from '@nestjs/config';
import { isErrorLike } from 'src/core/utils/type-guards';
@Injectable()
export class RabbitMQEventPublisher implements IEventPublisher {
  private readonly exchange: string;

  constructor(
    @Inject(LOGGER_TOKEN) private readonly logger: ILogger,
    @Inject(CONNECTION_SERVICE_TOKEN)
    private readonly connectionService: IConnectionService,
    private readonly configService: ConfigService,
  ) {
    this.exchange = this.configService.get<string>(
      'RABBITMQ_TASK_EXCHANGE',
      'RABBITMQ_TASK_EXCHANGE',
    );
  }

  async publishTaskCompletedEvent(taskId: string): Promise<void> {
    const event = {
      eventType: 'TaskCompleted',
      taskId: taskId,
      timestamp: new Date().toISOString(),
    };

    try {
      const channel = this.connectionService.getChannel();

      await channel.assertExchange(this.exchange, 'fanout', { durable: true });
      channel.publish(this.exchange, '', Buffer.from(JSON.stringify(event)));
      this.logger.log(
        `Published TaskCompleted event to exchange: ${this.exchange} for Task ID: ${taskId}`,
      );
    } catch (error) {
      if (isErrorLike(error)) {
        this.logger.error(
          `Failed to publish RabbitMQ message: ${error.message}`,
        );
        throw error;
      }
    }
  }
}
// (connection service import moved to top)
