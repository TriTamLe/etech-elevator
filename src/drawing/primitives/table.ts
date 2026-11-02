import { fittedText, hline, vline } from '#/drawing/prims'
import { ascent, descent, fitSize } from '#/drawing/text-metrics'
import type { Prim, Weight } from '#/drawing/types'

// A ruled table (the floor-height table of the vertical section): every cell centred,
// text shrunk to fit and cut with "…" last; a cell spanning columns has no rules inside.

export type TableCell = {
  text: string
  /** Columns this cell covers (default 1). */
  span?: number
  bold?: boolean
}

export type TableRow = { h: number; cells: ReadonlyArray<TableCell> }

export type TableOpts = {
  /** Top-left corner (sheet mm). */
  x: number
  y: number
  /** Column widths. */
  cols: ReadonlyArray<number>
  rows: ReadonlyArray<TableRow>
  size: number
  minSize: number
  /** Text inset from the column rules. */
  pad?: number
  weight?: Weight
}

export function table(o: TableOpts): Array<Prim> {
  const pad = o.pad ?? 1
  const edges = [o.x]
  for (const w of o.cols) edges.push(edges[edges.length - 1] + w)
  const right = edges[edges.length - 1]
  const out: Array<Prim> = []
  let top = o.y
  out.push(hline(top, o.x, right, o.weight))
  for (const row of o.rows) {
    const bottom = top + row.h
    out.push(hline(bottom, o.x, right, o.weight))
    let c = 0
    for (const cell of row.cells) {
      if (c >= o.cols.length) break
      const span = Math.max(1, Math.min(cell.span ?? 1, o.cols.length - c))
      const [l, r] = [edges[c], edges[c + span]]
      out.push(vline(l, top, bottom, o.weight))
      // A cell narrower than its padding holds no text. Centre on the size the text
      // ends up at, so shrunk text stays mid-row.
      const maxW = r - l - 2 * pad
      const style = { bold: cell.bold }
      const s = fitSize(cell.text.trim(), maxW, o.size, o.minSize, style)
      const baseline = top + row.h / 2 + ascent(s) / 2 - descent(s) / 2
      if (maxW > 0)
        out.push(
          ...fittedText(
            (l + r) / 2,
            baseline,
            cell.text,
            r - l - 2 * pad,
            o.size,
            o.minSize,
            { anchor: 'middle', bold: cell.bold },
          ),
        )
      c += span
    }
    out.push(vline(right, top, bottom, o.weight))
    top = bottom
  }
  return out
}
