import * as React from 'react'

/**
 * Sets `html[data-hydrated]` once this page's effects (shortcuts, handlers) are live. Call it
 * in the SSR page itself: the router hydrates route content inside its own Suspense
 * boundary, after the root shell, so a mark set by the shell would come too early.
 * E2E's `open()` waits for it.
 */
export function useHydrationMark() {
  React.useEffect(() => {
    document.documentElement.dataset.hydrated = ''
  }, [])
}
