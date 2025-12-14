import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TasksModule } from './tasks/task.module';
import { LOGGER_TOKEN } from './core/interfaces/logger.interface';
import { NestLoggerService } from './core/infrastructure/nest-logger.service';
import { RabbitMQConnectionService } from './core/infrastructure/rabbitmq-connection.service';
import { CONNECTION_SERVICE_TOKEN } from './core/interfaces/connection.service.interface';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
      }),
      inject: [ConfigService],
    }),
    TasksModule,
  ],
  providers: [
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
