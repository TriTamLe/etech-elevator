import * as React from 'react'

import { isTypingTarget, matchHotkey } from '#/lib/hotkey'

/** An open dialog, alert dialog or sheet owns the keyboard: page shortcuts wait. */
function modalOpen(): boolean {
  return (
    document.querySelector(
      '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
    ) !== null
  )
}

/**
 * Runs `handler` on `hotkey` (see hotkey.ts) anywhere on the page. Shortcuts are ignored
 * while typing in a field unless `allowInInputs` (for mod+… shortcuts such as save), and
 * while a dialog is open (they would act on the page behind it).
 */
export function useHotkey(
  hotkey: string,
  handler: (event: KeyboardEvent) => void,
  { allowInInputs = false, enabled = true } = {},
) {
  const latest = React.useRef(handler)
  React.useEffect(() => {
    latest.current = handler
  })
  React.useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing || e.repeat) return
      if (!matchHotkey(e, hotkey)) return
      if (!allowInInputs && isTypingTarget(e.target)) return
      // Still stop the browser's own action (print, save page) behind the dialog.
      e.preventDefault()
      if (modalOpen()) return
      latest.current(e)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hotkey, allowInInputs, enabled])
}
