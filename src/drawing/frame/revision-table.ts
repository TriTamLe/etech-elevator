import { REVISION_TABLE_ROWS } from '#/domain/config'
import type { ElevatorParams, Revision } from '#/domain/schema'
import { REVISION } from '#/drawing/frame/layout'
import { fittedText, hline, text, vline } from '#/drawing/prims'
import type { Prim } from '#/drawing/types'

/** Column heads as printed on the reference sheets, left to right. */
export const REVISION_COLUMNS: ReadonlyArray<[keyof Revision, string]> = [
  ['detail', 'Chi tiết'],
  ['change', 'Hiệu chỉnh'],
  ['date', 'Ngày hiệu chỉnh'],
  ['number', 'Lần hiệu chỉnh'],
  ['by', 'Nhân viên hiệu chỉnh'],
  ['checkedBy', 'Kiểm tra'],
  ['approvedBy', 'Duyệt'],
  ['requirement', 'Yêu cầu kỹ thuật'],
]

/** The revisions that get printed: the latest ones that fit (older ones are dropped). */
export function printedRevisions(p: ElevatorParams): Array<Revision> {
  return p.revisions.slice(-REVISION_TABLE_ROWS)
}

/** Revision table along the top edge: header row + REVISION_TABLE_ROWS data rows. */
export function revisionTable(p: ElevatorParams): Array<Prim> {
  const { cols, top, headerBottom, rowHeight } = REVISION
  const left = cols[0]
  const right = cols[cols.length - 1]
  const bottom = headerBottom + REVISION_TABLE_ROWS * rowHeight
  const out: Array<Prim> = [hline(headerBottom, left, right)]
  for (let r = 1; r < REVISION_TABLE_ROWS; r++)
    out.push(hline(headerBottom + r * rowHeight, left, right))
  // The outer rules belong to the border / title block; only inner rules and the bottom here.
  out.push(hline(bottom, left, right))
  for (const x of cols.slice(1, -1)) out.push(vline(x, top, bottom))

  REVISION_COLUMNS.forEach(([key, label], c) => {
    const x1 = cols[c]
    const x2 = cols[c + 1]
    const mid = (x1 + x2) / 2
    const maxW = x2 - x1 - 2 * REVISION.pad
    out.push(
      text(mid, REVISION.headerBaseline, label, REVISION.size, {
        anchor: 'middle',
      }),
    )
    printedRevisions(p).forEach((rev, r) => {
      out.push(
        ...fittedText(
          mid,
          headerBottom + r * rowHeight + REVISION.rowBaseline,
          rev[key],
          maxW,
          REVISION.size,
          REVISION.minSize,
          { anchor: 'middle' },
        ),
      )
    })
  })
  return out
}
