import { makeFloors } from '#/domain/schema'
import type { Floor } from '#/domain/schema'

// Floor list follows the stop count: keep rows that still fit, append defaults.

const validHeight = (h: number | null) =>
  h === null || (Number.isInteger(h) && h > 0)

/**
 * Resized list. The top floor's height input is hidden (its row is OH + top room), so an
 * invalid value left there would block autosave with no field to fix: it is cleared.
 * A valid one is kept — derive ignores it, and adding the floor back restores it.
 */
export function resizeFloors(
  floors: Array<Floor>,
  stops: number,
): Array<Floor> {
  const defaults = makeFloors(stops)
  const rows = defaults.map((d, i) => (i < floors.length ? floors[i] : d))
  return rows.map((row, i) =>
    i === rows.length - 1 && !validHeight(row.height)
      ? { ...row, height: null }
      : row,
  )
}

/**
 * True when shrinking to `stops` drops a row the user changed from its default. The
 * current top row's height is hidden (and ignored), so it does not count as an edit.
 */
export function wouldDropEdited(floors: Array<Floor>, stops: number): boolean {
  if (stops >= floors.length) return false
  const defaults = makeFloors(floors.length)
  const top = floors.length - 1
  return floors.slice(stops).some((f, k) => {
    const d = defaults[stops + k]
    return (
      f.name !== d.name ||
      (stops + k !== top && f.height !== d.height) ||
      f.jamb !== d.jamb ||
      f.hasDoor !== d.hasDoor
    )
  })
}
