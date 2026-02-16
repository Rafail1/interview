import {
  Controller,
  Post,
  Body,
  Param,
  Put,
  Get,
  NotFoundException as HttpNotFound,
  ConflictException as HttpConflictException,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiOkResponse,
  ApiBody,
} from '@nestjs/swagger';
import { CreateTaskUseCase } from 'src/tasks/application/use-cases/create-task.use-case';
import { CompleteTaskUseCase } from 'src/tasks/application/use-cases/complete-task.use-case';
import { GetTasksUseCase } from 'src/tasks/application/use-cases/get-tasks.use-case';
import { CreateTaskDto } from '../dtos/task.dto';
import {
  NotFoundAppException,
  ConflictAppException,
} from 'src/core/exceptions/index';

@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(
    private readonly createTaskUseCase: CreateTaskUseCase,
    private readonly completeTaskUseCase: CompleteTaskUseCase,
    private readonly getTasksUseCase: GetTasksUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiBody({ type: CreateTaskDto })
  @ApiCreatedResponse({
    description: 'Task created successfully',
    schema: {
      example: { id: 'uuid', message: 'Task created successfully' },
    },
  })
  async create(@Body() createTaskDto: CreateTaskDto) {
    const taskId = await this.createTaskUseCase.execute(createTaskDto);
    return { id: taskId, message: 'Task created successfully' };
  }

  @Get()
  @ApiOperation({ summary: 'List tasks' })
  @ApiOkResponse({ description: 'List of tasks' })
  async findAll() {
    const tasks = await this.getTasksUseCase.execute();

    return tasks.map((t) => ({
      id: t.getId(),
      title: t.getTitle(),
      description: t.getDescription(),
      status: t.getStatus().toString(),
      priority: t.getPriority().toString(),
      createdAt: t.getCreatedAt(),
    }));
  }

  @Put(':id/complete')
  @HttpCode(204)
  @ApiOperation({ summary: 'Mark task as complete' })
  @ApiNoContentResponse({ description: 'Task marked as complete' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiConflictResponse({ description: 'Task cannot be completed' })
  async complete(@Param('id') taskId: string) {
    try {
      await this.completeTaskUseCase.execute({ taskId });
    } catch (error) {
      if (error instanceof NotFoundAppException) {
        throw new HttpNotFound(error.message);
      }
      if (error instanceof ConflictAppException) {
        throw new HttpConflictException(error.message);
      }
      throw error;
    }
  }
}
