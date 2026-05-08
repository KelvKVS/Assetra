export function createCircuitBreaker(options = {}) {
  const failureThreshold = Number(options.failureThreshold ?? 5)
  const recoveryTimeMs = Number(options.recoveryTimeMs ?? 30_000)
  const monitorWindowMs = Number(options.monitorWindowMs ?? 60_000)

  let failures = 0
  let openedAt = 0
  let state = 'CLOSED'
  let lastFailureAt = 0

  function now() {
    return Date.now()
  }

  function resetWindowIfNeeded() {
    const t = now()
    if (t - lastFailureAt > monitorWindowMs) {
      failures = 0
    }
  }

  function canAttempt() {
    if (state === 'CLOSED') return true
    if (state === 'OPEN') {
      if (now() - openedAt >= recoveryTimeMs) {
        state = 'HALF_OPEN'
        return true
      }
      return false
    }
    return true
  }

  function recordSuccess() {
    state = 'CLOSED'
    failures = 0
    openedAt = 0
  }

  function recordFailure() {
    resetWindowIfNeeded()
    failures += 1
    lastFailureAt = now()
    if (failures >= failureThreshold) {
      state = 'OPEN'
      openedAt = now()
    }
  }

  async function execute(fn) {
    if (!canAttempt()) {
      const err = new Error('Circuit breaker aberto.')
      err.code = 'CIRCUIT_OPEN'
      throw err
    }
    try {
      const result = await fn()
      recordSuccess()
      return result
    } catch (error) {
      recordFailure()
      throw error
    }
  }

  function getState() {
    return {
      state,
      failures,
      openedAt: openedAt || null,
      failureThreshold,
      recoveryTimeMs,
      monitorWindowMs,
    }
  }

  return {
    execute,
    getState,
  }
}
