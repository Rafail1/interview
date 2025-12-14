export interface ITaskEventHandler {
  handleTaskCompleted(taskId: string): Promise<void>;
}
export const TASK_EVENT_HANDLER_TOKEN = Symbol('ITaskEventHandler');
