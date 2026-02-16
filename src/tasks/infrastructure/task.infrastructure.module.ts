import { Module } from '@nestjs/common';
import { TaskRepository } from './repositories/task.repository';
import { TaskMapper } from './mappers/task.mapper';
import { TASK_REPOSITORY_TOKEN } from '../domain/interfaces/task.repository.interface';
import { RabbitMQEventPublisher } from './messaging/rabbitmq-event.publisher';
import { EVENT_PUBLISHER_TOKEN } from 'src/core/interfaces/event-publisher.interface';
import { TaskEventHandlerService } from '../application/services/task-event-handler.service';
import { RabbitMQTaskConsumer } from './messaging/rabbitmq-task.consumer';
import { TASK_EVENT_HANDLER_TOKEN } from 'src/core/interfaces/task-event-handler.interface';
import { NestLoggerService } from 'src/core/infrastructure/nest-logger.service';
import { LOGGER_TOKEN } from 'src/core/interfaces/logger.interface';
import { CONNECTION_SERVICE_TOKEN } from 'src/core/interfaces/connection.service.interface';
import { RabbitMQConnectionService } from 'src/core/infrastructure/rabbitmq-connection.service';
import { PrismaService } from 'src/core/infrastructure/prisma.service';

@Module({
  providers: [
    PrismaService,
    TaskMapper,
    {
      provide: TASK_REPOSITORY_TOKEN,
      useClass: TaskRepository,
    },
    {
      provide: EVENT_PUBLISHER_TOKEN,
      useClass: RabbitMQEventPublisher,
    },
    {
      provide: TASK_EVENT_HANDLER_TOKEN,
      useClass: TaskEventHandlerService,
    },
    {
      provide: LOGGER_TOKEN,
      useClass: NestLoggerService,
    },
    {
      provide: CONNECTION_SERVICE_TOKEN,
      useClass: RabbitMQConnectionService,
    },
    RabbitMQTaskConsumer,
  ],
  exports: [TASK_REPOSITORY_TOKEN, EVENT_PUBLISHER_TOKEN],
})
export class TaskInfrastructureModule {}
