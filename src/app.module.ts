import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TasksModule } from './tasks/task.module';
import { BacktestingModule } from './backtesting/backtesting.module';
import { LOGGER_TOKEN } from './core/interfaces/logger.interface';
import { NestLoggerService } from './core/infrastructure/nest-logger.service';
import { RabbitMQConnectionService } from './core/infrastructure/rabbitmq-connection.service';
import { CONNECTION_SERVICE_TOKEN } from './core/interfaces/connection.service.interface';
import { PrismaService } from './core/infrastructure/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TasksModule,
    BacktestingModule,
  ],
  providers: [
    PrismaService,
    {
      provide: LOGGER_TOKEN,
      useClass: NestLoggerService,
    },
    {
      provide: CONNECTION_SERVICE_TOKEN,
      useClass: RabbitMQConnectionService,
    },
  ],
})
export class AppModule {}
