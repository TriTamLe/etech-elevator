import * as React from 'react'
import { useBlocker } from '@tanstack/react-router'

import type { SaveState } from '#/components/app/save-status'
import type { ElevatorParams } from '#/domain/schema'
import { shouldSave, snapshot } from '#/features/editor/autosave'
import type { EditorIssues } from '#/features/editor/issues'
import { useSaveProject } from '#/features/projects/queries'
import { useDebouncedValue } from '#/lib/use-debounced-value'

const AUTOSAVE_MS = 1500

/**
 * Saves valid params 1.5 s after the last edit (shape errors block saving; rule errors
 * only block the PDF). `flush()` saves now — used before a version snapshot and when
 * leaving the page. Navigation away with unsaved edits first tries to save, then asks.
 */
export function useAutosave(
  projectId: string,
  issues: EditorIssues,
  initial: ElevatorParams,
  /** When the server last saved these params (shown until the first autosave). */
  initialSavedAt: Date,
) {
  const save = useSaveProject(projectId)
  // What D1 will hold once every queued save has run (saves share one mutation scope, so
  // they land in order). Set before a request starts, put back if it fails — so editing
  // back to an older value while a save is in flight still counts as unsaved.
  const target = React.useRef(snapshot(initial))
  /** Settles when the last queued save has (successfully or not) finished. */
  const queue = React.useRef<Promise<unknown>>(Promise.resolve())
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
    queue.current = request.catch(() => undefined)
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
    void flush()
  }, [debounced, flush])

  const dirty = isDirty(issues, target.current)

  const blocker = useBlocker({
    shouldBlockFn: async () => {
      // Valid edits (or a save still in flight): finish saving, then let navigation through.
      const ok = await flush()
      await queue.current
      return !ok || isDirty(latest.current, target.current)
    },
    enableBeforeUnload: () =>
      save.isPending || isDirty(latest.current, target.current),
    withResolver: true,
  })

  const state: SaveState = save.isPending
    ? { kind: 'saving' }
    : !issues.params
      ? { kind: 'invalid', count: issues.errors }
      : dirty
        ? result?.kind === 'error'
          ? { kind: 'error', retry: () => void flush() }
          : { kind: 'pending' }
        : result?.kind === 'saved'
          ? result
          : { kind: 'idle' }

  return { state, flush, blocker }
}

function isDirty(issues: EditorIssues, target: string): boolean {
  return issues.params ? snapshot(issues.params) !== target : true
}
