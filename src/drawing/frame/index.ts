import type { Derived, Page } from '#/domain/derive'
import type { ElevatorParams } from '#/domain/schema'
import { border } from '#/drawing/frame/border'
import { revisionTable } from '#/drawing/frame/revision-table'
import { titleBlock } from '#/drawing/frame/title-block'
import type { Prim } from '#/drawing/types'

/** A numbered sheet: border, revision table, title block, then the sheet's own content. */
export function framed(
  p: ElevatorParams,
  d: Derived,
  page: Page,
  content: Array<Prim>,
): Array<Prim> {
  return [
    ...border(),
    ...revisionTable(p),
    ...titleBlock(p, d, page),
    ...content,
  ]
}
