import { GetTasksUseCase } from './get-tasks.use-case';
import { Task } from 'src/tasks/domain/entities/task.entity';

describe('GetTasksUseCase', () => {
  it('returns tasks from repository', async () => {
    const sample = Task.create(
      'id-1',
      'Title',
      'Description',
      undefined,
      undefined,
    );

    const mockRepo = { findAll: jest.fn().mockResolvedValue([sample]) } as any;
    const mockLogger = {
      debug: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
    } as any;

    const uc = new GetTasksUseCase(mockRepo, mockLogger);

    const result = await uc.execute();

    expect(mockRepo.findAll).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].getId()).toBe('id-1');
    expect(result[0].getTitle()).toBe('Title');
  });
});
