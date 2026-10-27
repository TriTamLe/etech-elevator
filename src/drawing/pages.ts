import type { Derived, Page } from '#/domain/derive'
import type { ElevatorParams } from '#/domain/schema'
import { framed } from '#/drawing/frame'
import { coverSheet } from '#/drawing/sheets/cover'
import type { Prim } from '#/drawing/types'

/**
 * Primitives for one sheet of the set. The cover is real; other sheets are the frame with
 * an empty drawing area until their sheet functions land (DTP 01/02 in P5b, the rest P9+).
 */
export function renderPage(
  p: ElevatorParams,
  d: Derived,
  page: Page,
): Array<Prim> {
  if (page.key === 'cover') return coverSheet(p, d)
  return framed(p, d, page, [])
}
