'use strict'
const { test } = require('tap')

const { Task } = require('../lib/task')

const Retry = require('..')

test('Retry/Task', suite => {
  suite.plan(1)
  suite.comment(
    'Any breaking change in this suite should be considered a major version bump.'
  )

  suite.test('Should expose right APIs', t => {
    const retry = new Retry()
    const task = retry.pick()

    t.plan(12)
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
  })
})

test('Retry/Task', { todo: true })

test('Retry/Task#Reset', { todo: true })
test('Retry/Task#Custom State', { todo: true })
