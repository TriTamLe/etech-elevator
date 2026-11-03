/**
 * Runs `task` when the browser is idle (at the latest after `timeout` ms); returns a
 * cancel function. Safari has no requestIdleCallback: a plain task there.
 */
export function whenIdle(task: () => void, timeout = 1000): () => void {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(task, { timeout })
    return () => cancelIdleCallback(id)
  }
  const id = setTimeout(task, 0)
  return () => clearTimeout(id)
}
