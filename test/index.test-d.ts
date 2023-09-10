import { EventEmitter } from 'node:events';

import { expectType, expectAssignable } from 'tsd';

import MainRetry, { Retry, RetryOptions, RetryTaskOptions, Task } from '..';

const retry = new MainRetry({
  maxTimeout: 1000,
  minTimeout: 100,
  retries: 3,
  factor: 2,
});
const task = retry.pick();

const retryOpts: RetryOptions = {
  factor: 2,
  maxTimeout: 1000,
  minTimeout: 100,
  retries: 3,
};
const taskOpts: RetryTaskOptions = {
  currentTimeout: 100,
  id: 'id',
  retries: 3,
  signal: new AbortController().signal,
};

expectType<Retry>(retry);
expectType<Task>(task);
expectType<Task>(retry.pick(taskOpts));
expectType<Retry>(new MainRetry(retryOpts));
expectAssignable<EventEmitter>(new MainRetry());
expectType<Promise<void>>(task.timeout());
expectType<void>(task.reset());
expectType<true>(task.start());
expectType<boolean>(task.shouldRetry(new Error()));
expectType<boolean>(task.aborted);
expectType<Error[]>(task.history);
expectType<Error>(task.rootError);
expectType<string>(task.id);
expectType<number>(task.retries);
expectType<AbortSignal>(task.signal);

expectType<RetryOptions>(retry.config);
expectType<Promise<unknown>>(retry.run(() => {}));
expectType<Promise<boolean>>(retry.run(() => true, { retries: 3 }));
