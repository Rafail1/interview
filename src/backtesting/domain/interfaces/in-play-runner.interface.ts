export interface IInPlayRunner {
  enqueue(runId: string): void;
}

export const IN_PLAY_RUNNER_TOKEN = Symbol('IInPlayRunner');
