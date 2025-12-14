import { TasksController } from './tasks.controller';
import { Task } from '../../domain/entities/task.entity';
import { CreateTaskDto } from '../dtos/task.dto';
import {
  NotFoundAppException,
  ConflictAppException,
} from '../../../core/exceptions/index';
import {
  NotFoundException as HttpNotFound,
  ConflictException as HttpConflict,
} from '@nestjs/common';

describe('TasksController', () => {
  it('findAll returns mapped tasks', async () => {
    const sample = Task.create('id-1', 'T', 'D', undefined, undefined);

    const createMock = { execute: jest.fn() } as any;
    const completeMock = { execute: jest.fn() } as any;
    const getMock = { execute: jest.fn().mockResolvedValue([sample]) } as any;

    const controller = new TasksController(createMock, completeMock, getMock);

    const res = await controller.findAll();

    expect(getMock.execute).toHaveBeenCalled();
    expect(Array.isArray(res)).toBe(true);
    expect(res[0]).toHaveProperty('id', 'id-1');
    expect(res[0]).toHaveProperty('title', 'T');
  });

  it('create returns id and message', async () => {
    const createMock = {
      execute: jest.fn().mockResolvedValue('id-123'),
    } as any;
    const completeMock = { execute: jest.fn() } as any;
    const getMock = { execute: jest.fn() } as any;

    const controller = new TasksController(createMock, completeMock, getMock);

    const dto: CreateTaskDto = {
      title: 'abc',
      description: 'd',
      priority: 'LOW',
    };
    const result = await controller.create(dto);

    expect(createMock.execute).toHaveBeenCalledWith(dto);
    expect(result).toEqual({
      id: 'id-123',
      message: 'Task created successfully',
    });
  });

  it('complete maps NotFoundAppException to HttpNotFound', async () => {
    const createMock = { execute: jest.fn() } as any;
    const completeMock = {
      execute: jest.fn().mockRejectedValue(new NotFoundAppException('no')),
    } as any;
    const getMock = { execute: jest.fn() } as any;

    const controller = new TasksController(createMock, completeMock, getMock);

    await expect(controller.complete('id-x')).rejects.toBeInstanceOf(
      HttpNotFound,
    );
  });

  it('complete maps ConflictAppException to HttpConflict', async () => {
    const createMock = { execute: jest.fn() } as any;
    const completeMock = {
      execute: jest
        .fn()
        .mockRejectedValue(new ConflictAppException('conflict')),
    } as any;
    const getMock = { execute: jest.fn() } as any;

    const controller = new TasksController(createMock, completeMock, getMock);

    await expect(controller.complete('id-x')).rejects.toBeInstanceOf(
      HttpConflict,
    );
  });
});
