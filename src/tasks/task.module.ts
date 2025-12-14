import { Module } from '@nestjs/common';

import { TaskInfrastructureModule } from './infrastructure/task.infrastructure.module';

import { TasksController } from './interfaces/http/tasks.controller';

import { CreateTaskUseCase } from './application/use-cases/create-task.use-case';
import { CompleteTaskUseCase } from './application/use-cases/complete-task.use-case';
import { GetTasksUseCase } from './application/use-cases/get-tasks.use-case';
import { NestLoggerService } from 'src/core/infrastructure/nest-logger.service';
import { LOGGER_TOKEN } from 'src/core/interfaces/logger.interface';

@Module({
  imports: [TaskInfrastructureModule],
  controllers: [TasksController],
  providers: [
    CreateTaskUseCase,
    CompleteTaskUseCase,
    GetTasksUseCase,
    {
      provide: LOGGER_TOKEN,
      useClass: NestLoggerService,
    },
  ],
  exports: [],
})
export class TasksModule {}
