/// <reference types="node" />
import { EventEmitter } from 'node:events';

type RetryOptions = {
  /**
   * The number of times to retry the operation. In ms
   *
   * @type {number}
   * @default 3
   */
  retries?: number;
  /**
   * The exponential factor to use.
   * 2 means the first delay is 2 times the base, the second 2^2 times the base,
   * the third 2^3 times the base, and so on.
   *
   * @type {number}
   * @default 2
   */
  factor?: number;
  /**
   * The number of milliseconds before starting the first retry.
   *
   * @type {number}
   * @default 500
   */
  minTimeout?: number;
  /**
   * The maximum number of milliseconds between two retries.
   *
   * @type {number}
   * @default 3000
   */
  maxTimeout?: number;
};

type RetryTaskOptions = {
  id?: string;
  signal?: AbortSignal;
  retries?: number;
  currentTimeout?: number;
};

type RetriableFunction = (...args: unknown[]) => unknown | Promise<unknown>;
type UnwrappedReturnedValue<T extends RetriableFunction = RetriableFunction> =
  ReturnType<T> extends Promise<infer U> ? U : ReturnType<T>;

// Should be synchronous
type ShouldRetryHandler = (err: Error) => boolean;

type RetryRunOptions =
  | {
      shouldRetry?: ShouldRetryHandler;
    }
  | RetryTaskOptions;

declare class Task {
  id: string;
  aborted: boolean;
  signal: AbortSignal;
  retries: number;
  history: Error[];
  rootError: Task['history'][0];

  start(signal?: AbortSignal): true;
  reset(): void;
  shouldRetry(err: Error): boolean;
  timeout(): Promise<void>;
}

declare class Retry extends EventEmitter {
  constructor(options?: RetryOptions);

  config: RetryOptions;

  run<
    F extends RetriableFunction = RetriableFunction,
    Result = UnwrappedReturnedValue<F>
  >(fn: F, options?: RetryRunOptions): Promise<Result>;

  pick(opts?: RetryTaskOptions): Task;
}

export default Retry;

export {
  Task,
  Retry,
  RetryOptions,
  RetryTaskOptions,
  RetriableFunction,
  ShouldRetryHandler,
  RetryRunOptions,
};
