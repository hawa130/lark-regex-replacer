/**
 * Process an array of items during browser idle periods.
 * Uses requestIdleCallback + timeRemaining() for adaptive batching.
 * Supports cancellation via AbortSignal.
 */
export function processItemsIdle<T>(
  items: T[],
  processOne: (item: T) => void,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let i = 0

    function work(deadline: IdleDeadline) {
      if (signal.aborted) {
        reject(signal.reason)
        return
      }

      while (i < items.length && deadline.timeRemaining() > 0) {
        if (signal.aborted) {
          reject(signal.reason)
          return
        }
        processOne(items[i++])
      }

      if (i < items.length) {
        requestIdleCallback(work)
      } else {
        resolve()
      }
    }

    requestIdleCallback(work)
  })
}
