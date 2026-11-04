import * as React from 'react'
import { onlineManager } from '@tanstack/react-query'

/** Whether the browser is online, as TanStack Query sees it (it pauses requests offline). */
export function useOnline(): boolean {
  return React.useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
    () => true,
  )
}
