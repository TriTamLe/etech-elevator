import * as React from 'react'
import { useBlocker } from '@tanstack/react-router'

import type { ElevatorParams } from '#/domain/schema'
import { saveStatus, shouldSave, snapshot } from '#/features/editor/autosave'
import type { EditorIssues } from '#/features/editor/issues'
import { useSaveProject } from '#/features/projects/queries'
import { useDebouncedValue } from '#/lib/use-debounced-value'
import { useOnline } from '#/lib/use-online'

const AUTOSAVE_MS = 1500

/**
 * Saves valid params 1.5 s after the last edit (shape errors block saving; rule errors
 * only block the PDF). `flush()` saves now — used before a version snapshot and when
 * leaving the page. Navigation away with unsaved edits first tries to save, then asks.
 * Offline, TanStack Query pauses the save and resumes it once the network is back; leaving
 * then asks at once (waiting for the save would hang the navigation).
 */
export function useAutosave(
  projectId: string,
  issues: EditorIssues,
  initial: ElevatorParams,
  /** When the server last saved these params (shown until the first autosave). */
  initialSavedAt: Date,
) {
  const save = useSaveProject(projectId)
  const online = useOnline()
  const onlineRef = React.useRef(online)
  onlineRef.current = online
  // What D1 will hold once every queued save has run (saves share one mutation scope, so
  // they land in order). Set before a request starts, put back if it fails — so editing
  // back to an older value while a save is in flight still counts as unsaved.
  const target = React.useRef(snapshot(initial))
  /** Settles when the last queued save has (successfully or not) finished. */
  const queue = React.useRef<Promise<unknown>>(Promise.resolve())
  /** Saves started and not settled (read synchronously, unlike save.isPending). */
  const inFlight = React.useRef(0)
  const latest = React.useRef(issues)
  latest.current = issues
  const [result, setResult] = React.useState<
    { kind: 'saved'; at: Date } | { kind: 'error' } | null
  >({ kind: 'saved', at: initialSavedAt })

  const flush = React.useCallback(async (): Promise<boolean> => {
    const params = latest.current.params
    if (params === null) return false
    if (!shouldSave(target.current, params)) return true
    const previous = target.current
    target.current = snapshot(params)
    const request = save.mutateAsync(params)
    inFlight.current += 1
    queue.current = request
      .catch(() => undefined)
      .finally(() => (inFlight.current -= 1))
    try {
      const item = await request
      setResult({ kind: 'saved', at: item.updatedAt })
      return true
    } catch {
      // Only roll back if no newer save was queued meanwhile.
      if (target.current === snapshot(params)) target.current = previous
      setResult({ kind: 'error' })
      return false
    }
    // `save.mutateAsync` is stable for the life of the mutation observer.
  }, [])

  const debounced = useDebouncedValue(issues, AUTOSAVE_MS)
  React.useEffect(() => {
    // Offline the edit just stays dirty: queuing one paused save per pause in typing
    // would replay them all on reconnect, when only the latest matters.
    if (onlineRef.current) void flush()
  }, [debounced, flush])

  // Back online: save the latest edit once (and retry one that failed as the network
  // dropped; saves already paused by Query resume by themselves).
  React.useEffect(() => {
    if (online) void flush()
  }, [online, flush])

  const dirty = isDirty(issues, target.current)

  const blocker = useBlocker({
    shouldBlockFn: async () => {
      if (!onlineRef.current) {
        // Ask at once: the latest edit saves when the network returns if the tab stays open.
        return inFlight.current > 0 || isDirty(latest.current, target.current)
      }
      // Valid edits (or a save still in flight): finish saving, then let navigation through.
      const ok = await flush()
      await queue.current
      return !ok || isDirty(latest.current, target.current)
    },
    enableBeforeUnload: () =>
      inFlight.current > 0 || isDirty(latest.current, target.current),
    withResolver: true,
  })

  const state = saveStatus({
    online,
    pending: save.isPending,
    valid: issues.params !== null,
    errors: issues.errors,
    dirty,
    last: result,
    retry: () => void flush(),
  })

  return { state, flush, blocker, online }
}

function isDirty(issues: EditorIssues, target: string): boolean {
  return issues.params ? snapshot(issues.params) !== target : true
}
