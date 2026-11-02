import { UNDERLINE_DROP, text, underlinedText } from '#/drawing/prims'
import { arrowHead } from '#/drawing/primitives/arrow-head'
import { DIM_RATIO } from '#/drawing/primitives/dimension'
import { measure } from '#/drawing/text-metrics'
import type { Prim, Pt } from '#/drawing/types'

// Leader notes as on the reference set ("*Dầm bê tông 200 x 400 / kiềng quanh hố
// thang"): the first line starts with "*" and is underlined, later lines are centred
// under it, and a straight leader runs from the underline's nearer end to an arrow at the
// target. Sheet coordinates throughout.

export type LeaderOpts = {
  /** Font size (em, sheet mm). */
  size: number
  /** Prefix the first line with "*" (default true). */
  star?: boolean
  head?: 'arrow' | 'none'
  /** Baseline pitch per em between lines. */
  lineGap?: number
}

/** Pitch between note lines per em, measured on the reference section sheet. */
export const LEADER_LINE_GAP = 1.3

/**
 * Note `lines` whose first line starts at `at` (baseline, left end), pointing at
 * `target`. Blank lines are dropped; no text draws nothing.
 */
export function leader(
  target: Pt,
  at: Pt,
  lines: ReadonlyArray<string>,
  o: LeaderOpts,
): Array<Prim> {
  const ls = lines.map((l) => l.trim()).filter(Boolean)
  if (!ls.length) return []
  const first = (o.star ?? true) ? `*${ls[0]}` : ls[0]
  const w = measure(first, o.size)
  const cx = at.x + w / 2
  const pitch = (o.lineGap ?? LEADER_LINE_GAP) * o.size
  const out: Array<Prim> = [...underlinedText(at.x, at.y, first, o.size)]
  ls.slice(1).forEach((l, i) => {
    out.push(text(cx, at.y + (i + 1) * pitch, l, o.size, { anchor: 'middle' }))
  })
  // Leader from the underline end on the target's side.
  const y = at.y + UNDERLINE_DROP * o.size
  const from: Pt = { x: target.x < cx ? at.x : at.x + w, y }
  if (Number.isFinite(target.x) && Number.isFinite(target.y)) {
    out.push({ kind: 'line', a: from, b: target, weight: 'thin' })
    if ((o.head ?? 'arrow') === 'arrow') {
      const arrow = DIM_RATIO.arrow * o.size
      out.push(
        arrowHead(
          target,
          { x: target.x - from.x, y: target.y - from.y },
          arrow,
          arrow * DIM_RATIO.arrowWidth,
        ),
      )
    }
  }
  return out
}
