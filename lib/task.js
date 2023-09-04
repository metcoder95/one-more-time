'use strict'
const {
  kTaskOptions,
  kState,
  kInterface,
  kRegisterAbortListener
} = require('./symbols')
const { addAbortListener } = require('./utils')

class Task {
  constructor (retryInterface, { id, retries, currentTimeout, signal } = {}) {
    this.id = id

    this[kInterface] = retryInterface

    this[kState] = {
      signalOff: null,
      timeoutId: null,
      aborted: signal?.aborted ?? false,
      signal: signal ?? null,
      history: [],
      retries: retries ?? 0,
      currentTimeout: currentTimeout ?? this[kInterface][kTaskOptions].minTimeout
    }
  }

  get retries () {
    return this[kState].retries
  }

  get history () {
    return this[kState].history
  }

  get rootError () {
    return this[kState].history[0]
  }

  [kRegisterAbortListener] () {
    this[kState].signalOff = addAbortListener(
      this[kState].signal,
      onAbort.bind(this)
    )

    function onAbort (reason) {
      this[kInterface].emit('abort', reason)

      this[kState].aborted = true
      this[kState].signalOff = null
    }
  }

  start (signal = null) {
    if (this[kState].aborted === true) {
      throw new Error('Task aborted. Did you forget to call "reset" first?')
    }

    if (this[kState].timeoutId != null || this[kState].retries !== 0) {
      throw new Error(
        'Task already started. Did you forget to call "reset" first?'
      )
    }

    if (
      signal != null &&
      typeof signal.on !== 'function' &&
      typeof signal.addEventListener !== 'function'
    ) {
      throw new TypeError('invalid signal')
    }

    this[kState].signal = signal
    this[kState].aborted = signal?.aborted ?? false

    if (signal != null) this[kRegisterAbortListener]()

    return true
  }

  reset () {
    const { timeoutId, signalOff } = this[kState]

    if (timeoutId != null) clearTimeout(timeoutId)
    if (this[kState].signalOff != null) signalOff()

    this[kState] = {
      retries: 0,
      currentTimeout: this[kInterface][kTaskOptions].minTimeout,
      history: [],
      timeoutId: null,
      signal: null,
      aborted: false,
      signalOff: null
    }
  }

  shouldRetry (error) {
    if (this[kState].aborted === true) {
      this.reset()
      return false
    }

    this[kState].retries++
    this[kState].history.push(error)

    this[kInterface].emit('retry', error, {
      retries: this[kState].retries,
      history: this[kState].history
    })

    if (error == null) {
      this.reset()
      return false
    }

    return this[kState].retries <= this[kInterface][kTaskOptions].retries
  }

  timeout () {
    return new Promise(resolve => {
      this[kState].timeoutId = setTimeout(() => {
        const { retries, currentTimeout } = this[kState]
        const { maxTimeout, factor } = this[kInterface][kTaskOptions]

        this[kState].timeoutId = null
        this[kState].currentTimeout = Math.min(
          maxTimeout,
          currentTimeout * factor ** retries
        )
        resolve()

        this[kInterface].emit('timeout', {
          retries: this[kState].retries,
          currentTimeout: this[kState].currentTimeout
        })
      }, this[kState].currentTimeout)
    })
  }
}

module.exports = { Task }