import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyStatic from '@fastify/static';
import { join } from 'node:path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  await app.register(fastifyStatic, {
    root: join(process.cwd(), 'public', 'backtest-viewer'),
    prefix: '/viewer/',
  });

  await app.register(fastifyStatic, {
    root: join(process.cwd(), 'public', 'realtime-viewer'),
    prefix: '/realtime-viewer/',
    decorateReply: false,
  });

  const config = new DocumentBuilder()
    .setTitle('Boilerplate API')
    .setDescription('Boilerplate API documentation')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
