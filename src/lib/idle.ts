const IDLE_TIMEOUT = 1000

/**
 * Process items during browser idle periods with adaptive batching.
 * Cancellable via AbortSignal. Rejects with DOMException on abort.
 */
export function processItemsIdle<T>(
  items: T[],
  processOne: (item: T) => void,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let i = 0
    let handle: number

    const abortError = () =>
      new DOMException("Processing aborted", "AbortError")

    function onAbort() {
      cancelIdleCallback(handle)
      reject(abortError())
    }

    function work(deadline: IdleDeadline) {
      if (signal.aborted) {
        reject(abortError())
        return
      }

      while (i < items.length && deadline.timeRemaining() > 0) {
        processOne(items[i++])
      }

      if (i < items.length) {
        handle = requestIdleCallback(work, { timeout: IDLE_TIMEOUT })
      } else {
        signal.removeEventListener("abort", onAbort)
        resolve()
      }
    }

    if (signal.aborted) {
      reject(abortError())
      return
    }

    signal.addEventListener("abort", onAbort)
    handle = requestIdleCallback(work, { timeout: IDLE_TIMEOUT })
  })
}
