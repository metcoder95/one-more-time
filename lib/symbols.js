module.exports = {
  // Retry
  kTaskOptions: Symbol('retry options'),
  kInternalIDCounter: Symbol('retry internal id counter'),
  // Task
  kState: Symbol('task state'),
  kPreRetry: Symbol('task pre retry'),
  kInterface: Symbol('task retry interface'),
  kRegisterAbortListener: Symbol('task register abort listener')
}
