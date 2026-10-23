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
