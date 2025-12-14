import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { TasksController } from '../src/tasks/interfaces/http/tasks.controller';
import { CreateTaskUseCase } from '../src/tasks/application/use-cases/create-task.use-case';
import { CompleteTaskUseCase } from '../src/tasks/application/use-cases/complete-task.use-case';
import { GetTasksUseCase } from '../src/tasks/application/use-cases/get-tasks.use-case';
import { TASK_REPOSITORY_TOKEN } from '../src/tasks/domain/interfaces/task.repository.interface';
import { EVENT_PUBLISHER_TOKEN } from '../src/core/interfaces/event-publisher.interface';
import { LOGGER_TOKEN } from '../src/core/interfaces/logger.interface';
import { Task } from '../src/tasks/domain/entities/task.entity';

describe('Tasks', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const tasks: Task[] = [];

    const inMemoryRepo = {
      findById: async (id: string) =>
        tasks.find((t) => t.getId() === id) ?? null,
      save: async (task: Task) => {
        const idx = tasks.findIndex((t) => t.getId() === task.getId());
        if (idx >= 0) tasks[idx] = task;
        else tasks.push(task);
      },
      findAll: async () => tasks.slice(),
    };

    const mockEventPublisher = { publishTaskCompletedEvent: jest.fn() };
    const mockLogger = { debug: jest.fn(), log: jest.fn(), error: jest.fn() };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        CreateTaskUseCase,
        CompleteTaskUseCase,
        GetTasksUseCase,
        { provide: TASK_REPOSITORY_TOKEN, useValue: inMemoryRepo },
        { provide: EVENT_PUBLISHER_TOKEN, useValue: mockEventPublisher },
        { provide: LOGGER_TOKEN, useValue: mockLogger },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /tasks -> GET /tasks', async () => {
    const createDto = {
      title: 'E2E Task',
      description: 'desc',
      priority: 'LOW',
    };

    const postRes = await request(app.getHttpServer())
      .post('/tasks')
      .send(createDto)
      .expect(201);

    expect(postRes.body).toHaveProperty('id');
    const id = postRes.body.id;

    const getRes = await request(app.getHttpServer()).get('/tasks').expect(200);

    expect(Array.isArray(getRes.body)).toBe(true);
    expect(getRes.body.some((t: any) => t.id === id)).toBe(true);
  });
});
