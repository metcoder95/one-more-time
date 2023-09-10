# One_More_Time

> A retry management library with a focus on flow control

This small library aims to provide granular control over the flow of retries. It is designed to be used in a functional style, and to be as unobtrusive as possible. It is also designed to be used with promises, and be aborted at any time through `AbortController` mechanism.

## It can be used in either of two ways:

### 1. As a wrapper

Acting as a wrapper over a passed function, this is the most common way and offloads all the `retry` control to the library. A promise is returned that will be resolved with the result of the wrapped function, or rejected with the last error that caused the retry to fail.

To decide when to retry, the library accepts as argument a function that returns a boolean. This function is called with the error that caused the retry. If the function returns `true`, the library will retry the wrapped function. If it returns `false`, the library will reject the promise with the last error that caused the retry to fail.

```javascript
const { Retry } = require('one_more_time');

let counter = 0;
const foo = () => {
  counter++;

  if (counter !== 3) {
    throw new Error('foo');
  } else {
    return 'bar';
  }
};

const shouldRetry = (err) => {
  return true;
};

const retry = new Retry();

const result = await retry.run(foo, { shouldRetry });
```

### 2. As a management tool

This enables the most control over the flow of the retry. It returns a `task` which is an instance of a `Task` class that aims to reprent an individual logic unit and its retry management. It is up to the user to decide when to retry, and when to stop retrying.

It exposes a `timeout` method that allows the user to wait for a given amount of time before retrying. It also exposes a `shouldRetry` method that can be used to decide whether to retry or not.

A `task` can be used as long as needed, but once is either `exhausted` or `aborted`, it needs to be reset for subsequent usage.

```javascript
const { Retry } = require('one_more_time');
const fn = () => {
  counter++;

  if (counter < 4) {
    throw new Error('I failed!');
  }
};

while (true) {
  try {
    fn();
    break;
  } catch (err) {
    if (task.shouldRetry(err)) {
      await task.timeout();
      continue;
    }

    throw err;
  }
}
```

## Setup

### Installation

Easy to install as:

> `npm install one_more_time`

### Retry

```ts
{
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
}
```

##### `Retry#run`

Acting as a wrapper over a passed function, this is the most common way and offloads all the `retry` control to the library.
A promise is returned that will be resolved with the result of the wrapped function, or rejected with the last error that caused the retry to fail.

**Arguments**

- `fn` - **required** - The function to wrap
- `options` - **optional** - The options to use for the retry, it enables to set a default state over the `task` that will be used to manage the given wrapped function. It also can be used to pass a `signal` to abort the retry at any time.
  - `id` - **optional** - The id to use for the task. If not provided, a random id will be generated.
  - `retries` - **optional** - The number of remaining retries for the operation. If not provided, will default to `0`.
  - `signal` - **optional** - The signal to use to abort the retry.
  - `currentTimeout` - **optional** - The current timeout to use for the retry. If not provided, will default to `minTimeout` passed when instantiating a `retry`.
  - `shouldRetry` - **optional** - The function to use to decide whether to retry or not. If not provided, will default to `() => true`.

**Example**

```js
const shouldRetry = (err) => {
  return true;
};

const foo = () => {
  // do something
};

const retry = new Retry();

const result = await retry.run(foo, { shouldRetry });
```

##### `Retry#pick`

It returns a `task` which is an instance of a `Task` class that aims to reprent an individual logic unit and its retry management.

**Arguments**

- `options` - **optional** - The options to use for the retry, it enables to set a default state over the `task` that will be used to manage the given wrapped function. It also can be used to pass a `signal` to abort the retry at any time.
  - `id` - **optional** - The id to use for the task. If not provided, a random id will be generated.
  - `retries` - **optional** - The number of remaining retries for the operation. If not provided, will default to `0`.
  - `signal` - **optional** - The signal to use to abort the retry.
  - `currentTimeout` - **optional** - The current timeout to use for the retry. If not provided, will default to `minTimeout` passed when instantiating a `retry`.

**Example**

```js
const fn = () => {
  // do something
};

const retry = new Retry();
const task = retry.pick();

while (true) {
  try {
    fn();
    break;
  } catch (err) {
    if (task.shouldRetry(err)) {
      await task.timeout();
      continue;
    }

    throw err;
  }
}
```

### Task

It represents an individual logic unit and its retry management. It is up to the user to decide when to retry, and when to stop retrying.

#### `Task#timeout`

It returns a promise that will be resolved after a given timeout.
It is calculated accordingly to the following formula:

```js
const timeout = Math.min(maxTimeout, currentTimeout * factor ** retries);
```

The promise can be `rejected` if the `signal` passed to the `task` is aborted.

#### `Task#shouldRetry`

It returns a boolean that indicates whether the task should retry or not, accordingly to the settings set for the `retry` instance, and the current state of the `task`.

It automatically returns `false` if the `retries` are exhausted, the `signal` is aborted, or the `err` is falsy.

**Arguments**

- `err` - **required** - The error that caused the retry.

#### `Task#reset`

It resets the `task` to its initial state for reusage.

#### `Task#start`

It starts the `task` by executing internal preparations to its state.
It accepts a `signal` for subsequent usage to abort the `task`.

If called when the `task` is already started (already in used or exhausted), it will throw an error.

**Arguments**

- `signal` - **optional** - The signal to use to abort the retry.

#### `Task.prototype`

- `id` - **readonly** - The id of the `task`.
- `retries` - **readonly** - The number of remaining retries for the operation.
- `signal` - **readonly** - The signal to use to abort the retry.
- `history` - **readonly** - The history of errors of the `task`.
- `rootError` - **readonly** - The root error of the `task`.
- `aborted` - **readonly** - Whether the `task` is aborted or not.


### License

- **MIT** : http://opensource.org/licenses/MIT
