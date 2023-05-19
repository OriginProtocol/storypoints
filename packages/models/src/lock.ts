enum LockIdent {
  WORKER = 1,
}

const locks: Record<number, number | undefined> = {}

/// Try to obtain an exclusive lock for a worker, returning if the lock was
/// granted and its expiration
export function obtainWorkerLock(ms = 60 * 1_000): [boolean, number] {
  const now = +new Date()

  if (!locks[LockIdent.WORKER]) {
    locks[LockIdent.WORKER] = now + ms
  } else {
    if (locks[LockIdent.WORKER] > now) {
      return [false, locks[LockIdent.WORKER]]
    } else {
      locks[LockIdent.WORKER] = now + ms
    }
  }

  return [true, locks[LockIdent.WORKER]]
}

/// Release the worker lock
export function releaseWorkerLock() {
  locks[LockIdent.WORKER] = 0
}
