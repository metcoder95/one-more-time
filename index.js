'use strict'
const { EventEmitter } = require('events')

const { kInternalIDCounter, kTaskOptions } = require('./lib/symbols')

const { getDeferredPromise } = require('./lib/utils')

const { Task } = require('./lib/task')

class Retry extends EventEmitter {
  constructor ({
    maxTimeout, // In seconds
    minTimeout, // In seconds
    factor,
    retries
  } = {}) {
    if (
      maxTimeout != null &&
      (typeof maxTimeout !== 'number' || maxTimeout < 1)
    ) {
      throw new TypeError('maxTimeout must be positive integer')
    }

    if (
      minTimeout != null &&
      (typeof minTimeout !== 'number' ||
        minTimeout < 1 ||
        minTimeout > maxTimeout)
    ) {
      throw new TypeError(
        'minTimeout must be a positive integer and less than maxTimeout'
      )
    }

    if (factor != null && (typeof factor !== 'number' || factor < 1)) {
      throw new TypeError('factor must be a positive integer')
    }

    if (retries != null && (typeof retries !== 'number' || retries < 1)) {
      throw new TypeError('retries must be a positive integer')
    }

    super('OneMoreTime#Retry')

    this[kTaskOptions] = {
      maxTimeout: maxTimeout ?? 30 * 1000, // In milliseconds
      minTimeout: minTimeout ?? 500,
      factor: factor ?? 2,
      retries: retries ?? 3
    }

    this[kInternalIDCounter] = 0
  }

  get config () {
    return { ...this[kTaskOptions] }
  }

  pick ({ id, signal, retries, currentTimeout } = {}) {
    if (id != null && typeof id !== 'string') {
      throw new TypeError('id must be a string')
    }

    if (
      signal != null &&
      typeof signal.on !== 'function' &&
      typeof signal.addEventListener !== 'function'
    ) {
      throw new TypeError('invalid signal')
    }

    const taskId = id ?? `task-${this[kInternalIDCounter]++}`
    const task = new Task(this, { id: taskId, signal, retries, currentTimeout })

    return task
  }

  run (fn, { shouldRetry, ...taskOpts } = {}) {
    if (typeof fn !== 'function') {
      throw new TypeError('fn must be a function')
    }

    if (shouldRetry != null && typeof shouldRetry !== 'function') {
      throw new TypeError('shouldRetry must be a function')
    }

    shouldRetry = shouldRetry ?? (() => true)

    const task = this.pick(taskOpts)

    return exec()

    function exec (promise, resolve, reject) {
      if (promise == null) {
        ;({ resolve, reject, promise } = getDeferredPromise())
      }

      try {
        const res = fn(task)

        if (res.then != null && typeof res.then === 'function') {
          return res.then(
            result => {
              resolve(result)
            },
            error => {
              if (shouldRetry(error) && task.shouldRetry(error)) {
                return task
                  .timeout()
                  .then(() => exec(promise, resolve, reject), reject)
              }

              reject(error)
            }
          )
        }

        resolve(res)
      } catch (error) {
        if (shouldRetry(error) && task.shouldRetry(error)) {
          return task.timeout().then(() => exec(promise, resolve, reject))
        }

        reject(error)
      }

      return promise
    }
  }

  static Retry = Retry

  static default = Retry
}

module.exports = Retry
