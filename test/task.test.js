'use strict'
const { test } = require('tap')

const { Task } = require('../lib/task')

const Retry = require('..')

test('Retry/Task', suite => {
  suite.plan(4)
  suite.comment(
    'Any breaking change in this suite should be considered a major version bump.'
  )

  suite.test('Should expose right APIs', t => {
    const retry = new Retry()
    const task = retry.pick({ signal: new AbortController().signal })

    t.plan(14)
    t.type(task, Task)
    t.equal(typeof task.start, 'function')
    t.equal(task.start.length, 0)
    t.equal(typeof task.reset, 'function')
    t.equal(task.reset.length, 0)
    t.equal(typeof task.shouldRetry, 'function')
    t.equal(task.shouldRetry.length, 1)
    t.equal(typeof task.timeout, 'function')
    t.equal(task.timeout.length, 0)
    t.equal(task.retries, 0)
    t.notOk(task.rootError)
    t.match(task.history, [])
    t.notOk(task.aborted)
    t.type(task.signal, AbortSignal)
  })

  suite.test(
    'Should not allow fresh start if task already aborted',
    { skip: (AbortController || null) == null },
    t => {
      const retry = new Retry()
      const controller = new AbortController()
      const task = retry.pick({ signal: controller.signal })

      controller.abort()
      t.plan(1)

      t.throws(
        () => task.start(),
        new Error('Task aborted. Did you forget to call "reset" first?')
      )
    }
  )

  suite.test('Should not allow fresh start if task already started', t => {
    const retry = new Retry()
    const task = retry.pick({ retries: 3 })

    t.plan(1)
    t.throws(
      () => task.start(),
      new Error('Task already started. Did you forget to call "reset" first?')
    )
  })

  suite.test('Should throw if bad signal passed', t => {
    const retry = new Retry()
    const task = retry.pick()

    t.plan(1)
    t.throws(() => task.start('bad signal'), new TypeError('invalid signal'))
  })
})

test('Retry/Task', suite => {
  suite.plan(3)

  suite.test('Should enable granular flow control', async t => {
    let counter = 0
    const retry = new Retry()
    const task = retry.pick()
    const expectedError = new Error('foo')
    const fn = () => {
      counter++

      if (counter < 4) {
        throw expectedError
      }
    }

    t.plan(4)

    while (true) {
      try {
        fn()
        break
      } catch (err) {
        if (task.shouldRetry(err)) {
          await task.timeout()
          continue
        }

        throw err
      }
    }

    t.equal(counter, 4)
    t.equal(task.retries, 3)
    t.equal(task.history.length, 3)
    t.equal(task.rootError, expectedError)
  })

  suite.test(
    'Should not retry if task aborted',
    { skip: (AbortController || null) == null },
    async t => {
      let counter = 0
      const retry = new Retry()
      const controller = new AbortController()
      const task = retry.pick({ signal: controller.signal })
      const expectedError = new Error('foo')
      const fn = () => {
        counter++

        if (counter < 4) {
          throw expectedError
        }
      }

      t.plan(5)

      controller.abort()

      try {
        fn()
      } catch (err) {
        t.notOk(task.shouldRetry(err))
      }

      t.equal(counter, 1)
      t.equal(task.retries, 0)
      t.equal(task.history.length, 1)
      t.equal(task.rootError, expectedError)
    }
  )

  suite.test(
    'Should not retry if task aborted',
    { skip: (AbortController || null) == null },
    async t => {
      let counter = 0
      const retry = new Retry()
      const controller = new AbortController()
      const task = retry.pick({ signal: controller.signal })
      const expectedError = new Error('foo')
      const fn = () => {
        counter++

        if (counter < 3) {
          throw expectedError
        }

        controller.abort()
      }

      t.plan(5)

      while (true) {
        try {
          fn()
          break
        } catch (err) {
          if (task.shouldRetry(err)) {
            await task.timeout()
            continue
          }

          break
        }
      }

      t.ok(task.aborted)
      t.equal(counter, 3)
      t.equal(task.retries, 2)
      t.equal(task.history.length, 2)
      t.equal(task.rootError, expectedError)
    }
  )
})

test('Retry/Task#Reset', { todo: true })
test('Retry/Task#Custom State', { todo: true })
