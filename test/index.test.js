'use strict'
const { EventEmitter } = require('events')

const { test } = require('tap')

const { Task } = require('../lib/task')

const Retry = require('..')

test('Retry#Module', suite => {
  suite.plan(4)
  suite.comment(
    'Any breaking change in this suite should be considered a major version bump.'
  )

  suite.test('Should export Retry class', t => {
    t.plan(4)

    t.equal(typeof Retry, 'function')
    t.ok(Retry.prototype instanceof EventEmitter)
    t.equal(Retry, Retry.Retry)
    t.equal(Retry.default, Retry)
  })

  suite.test('Instances', t => {
    const retry = new Retry()
    const retry2 = new Retry.Retry()
    // eslint-disable-next-line new-cap
    const retry3 = new Retry.default()

    t.plan(3)
    t.type(retry, Retry)
    t.type(retry2, Retry)
    t.type(retry3, Retry)
  })

  suite.test('Should expose right APIs', t => {
    const retry = new Retry()
    const config = {
      maxTimeout: 30 * 1000, // In milliseconds
      minTimeout: 500,
      factor: 2,
      retries: 3
    }

    t.plan(6)

    t.match(retry.config, config)
    retry.config.factor = 1
    t.match(retry.config, config)

    t.equal(typeof retry.pick, 'function')
    t.equal(retry.pick.length, 0)
    t.equal(typeof retry.run, 'function')
    t.equal(retry.run.length, 1)
  })

  suite.test('Should throw on invalid options', t => {
    t.plan(9)

    t.throws(
      () => new Retry({ maxTimeout: 'foo' }),
      'maxTimeout must be positive integer'
    )
    t.throws(
      () => new Retry({ maxTimeout: -1 }),
      'maxTimeout must be positive integer'
    )
    t.throws(
      () => new Retry({ minTimeout: -1 }),
      'minTimeout must be a positive integer and less than maxTimeout'
    )
    t.throws(
      () => new Retry({ minTimeout: '' }),
      'minTimeout must be a positive integer and less than maxTimeout'
    )
    t.throws(
      () => new Retry({ minTimeout: 10, maxTimeout: 5 }),
      'minTimeout must be a positive integer and less than maxTimeout'
    )
    t.throws(
      () => new Retry({ factor: -1 }),
      'factor must be a positive integer'
    )
    t.throws(
      () => new Retry({ factor: '' }),
      'factor must be a positive integer'
    )
    t.throws(
      () => new Retry({ retries: 0 }),
      'retries must be positive integer'
    )
    t.throws(
      () => new Retry({ retries: false }),
      'retries must be positive integer'
    )
  })
})

test('Retry#pick', suite => {
  suite.plan(3)

  suite.test('Should throw on invalid options', t => {
    t.plan(2)

    t.throws(() => new Retry().pick({ id: 1 }), 'id must be a string')
    t.throws(() => new Retry().pick({ signal: 1 }), 'invalid signal')
  })

  suite.test('Should return a task', t => {
    const retry = new Retry()

    t.plan(2)

    t.type(retry.pick(), Task)
    t.type(retry.pick({}), Task)
  })

  suite.test('Should return a task with right defaults', t => {
    const retry = new Retry()

    t.plan(2)

    const task = retry.pick({
      id: 'foo',
      signal: new AbortController().signal,
      retries: 1,
      currentTimeout: 1000
    })

    t.equal(task.id, 'foo')
    t.type(task, Task)
  })
})

test('Retry#run', suite => {
  suite.plan(5)

  suite.test('Should throw on invalid options', t => {
    t.plan(2)

    t.throws(() => new Retry().run(1), 'task must be a function')
    t.throws(
      () => new Retry().run(() => {}, { shouldRetry: 1 }),
      'shouldRetry must be a function'
    )
  })

  suite.test('Should execute a given function', async t => {
    let timeoutCalled = false
    let retryCalled = false
    let counter = 0
    let retryCounter = 0
    const foo = () => {
      counter++

      if (counter !== 3) {
        throw new Error('foo')
      } else {
        return 'bar'
      }
    }
    const shouldRetry = () => {
      retryCounter++
      return true
    }

    t.plan(5)
    const retry = new Retry()

    retry.once('timeout', () => {
      timeoutCalled = true
    })
    retry.once('retry', () => {
      retryCalled = true
    })

    const result = await retry.run(foo, { shouldRetry })

    t.equal(result, 'bar')
    t.equal(counter, 3)
    t.equal(retryCounter, 2)
    t.ok(timeoutCalled)
    t.ok(retryCalled)
  })

  suite.test(
    'Should execute a given function with state overrides',
    async t => {
      let counter = 0
      let retryCounter = 0
      const foo = () => {
        counter++

        if (counter !== 3) {
          throw new Error('foo')
        } else {
          return 'bar'
        }
      }
      const shouldRetry = err => {
        retryCounter++
        t.type(err, Error)
        return true
      }

      t.plan(5)
      const retry = new Retry()
      const result = await retry.run(foo, {
        shouldRetry,
        retries: 1,
        currentTimeout: 1000
      })

      t.equal(result, 'bar')
      t.equal(counter, 3)
      t.equal(retryCounter, 2)
    }
  )

  suite.test('Should exhaust retries for a given function', async t => {
    let counter = 0
    const foo = () => {
      counter++

      throw new Error('foo')
    }

    t.plan(2)
    const retry = new Retry()
    await t.rejects(retry.run.bind(retry, foo), 'foo')

    t.equal(counter, 4)
  })

  suite.test(
    'Should be aborted if signal is passed',
    { skip: (AbortController || null) == null },
    async t => {
      let abortReason
      let counter = 0
      let abortedCalled = false
      const reason = new Error('aborted!')
      const retry = new Retry()
      const controller = new AbortController()
      const foo = () => {
        counter++

        if (counter < 3) {
          throw new Error('foo')
        }

        controller.abort(reason)
      }

      t.plan(4)

      retry.once('abort', err => {
        abortedCalled = true
        abortReason = err
      })

      await t.rejects(
        retry.run.bind(retry, foo, { signal: controller.signal }),
        'foo'
      )

      t.equal(counter, 3)
      t.ok(abortedCalled)
      t.equal(abortReason, reason)
    }
  )
})
