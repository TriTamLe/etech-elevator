import type { SaveState } from '#/components/app/save-status'
import type { ElevatorParams } from '#/domain/schema'

/** Canonical text of params, to tell whether anything changed since the last save. */
export function snapshot(params: ElevatorParams): string {
  return JSON.stringify(params)
}

/** Save only valid params that differ from what the server already has. */
export function shouldSave(
  lastSaved: string,
  params: ElevatorParams | null,
): params is ElevatorParams {
  return params !== null && snapshot(params) !== lastSaved
}

export type SaveInputs = {
  online: boolean
  /** A save request has started and not settled (waiting behind another counts too). */
  pending: boolean
  /** The form passes the Zod shape (only then can it be saved). */
  valid: boolean
  errors: number
  /** Valid params differ from what D1 will hold once queued saves land. */
  dirty: boolean
  /** Outcome of the last save that finished. */
  last: { kind: 'saved'; at: Date } | { kind: 'error' } | null
  retry: () => void
}

/**
 * The status line. Offline wins while anything waits for the network; a save queued
 * behind another (same mutation scope, isPaused in Query) is still just "saving".
 */
export function saveStatus(i: SaveInputs): SaveState {
  if (!i.online && (i.pending || (i.valid && i.dirty)))
    return { kind: 'offline' }
  if (i.pending) return { kind: 'saving' }
  if (!i.valid) return { kind: 'invalid', count: i.errors }
  if (i.dirty) {
    return i.last?.kind === 'error'
      ? { kind: 'error', retry: i.retry }
      : { kind: 'pending' }
  }
  return i.last?.kind === 'saved' ? i.last : { kind: 'idle' }
}
