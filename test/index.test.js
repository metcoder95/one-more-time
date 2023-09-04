'use strict'
const { EventEmitter } = require('events')

const { test } = require('tap')

const { Task } = require('../lib/task')

const Retry = require('..')

test('Retry#Module', suite => {
  suite.plan(3)
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
})

test('Retry#pick', suite => {
  suite.plan(2)

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
  suite.plan(3)

  suite.test('Should execute a given function', async t => {
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

    t.plan(3)
    const retry = new Retry()
    const result = await retry.run(foo, { shouldRetry })

    t.equal(result, 'bar')
    t.equal(counter, 3)
    t.equal(retryCounter, 2)
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
      const shouldRetry = () => {
        retryCounter++
        return true
      }

      t.plan(3)
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
})
