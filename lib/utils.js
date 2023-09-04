let events
function addAbortListener (signal, listener) {
  let off

  if (typeof Symbol.dispose === 'symbol') {
    if (!events) events = require('node:events')

    if (typeof events.addAbortListener === 'function' && 'aborted' in signal) {
      return events.addAbortListener(signal, listener)
    }
  }

  if ('addEventListener' in signal) {
    signal.addEventListener('abort', listener, { once: true })
    off = () => signal.removeEventListener('abort', listener)
  } else {
    signal.addListener('abort', listener)
    off = () => signal.removeListener('abort', listener)
  }

  return off
}

function getDeferredPromise () {
  let resolve
  let reject

  // eslint-disable-next-line promise/param-names
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

module.exports = { addAbortListener, getDeferredPromise }
