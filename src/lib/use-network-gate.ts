import { useHydrated } from '@tanstack/react-router'

import { OFFLINE_TEXT } from '#/config/app'
import { useOnline } from '#/lib/use-online'

/**
 * Gate for buttons that call the server. `hydrated` is false in the SSR HTML and until
 * React attaches handlers (a click there would be lost: render those `disabled`);
 * `offline` is the reason to show while the network is down (render `aria-disabled`).
 */
export function useNetworkGate(): { hydrated: boolean; offline: string | null } {
  const hydrated = useHydrated()
  const online = useOnline()
  return { hydrated, offline: online ? null : OFFLINE_TEXT.needsNetwork }
}
