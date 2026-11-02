import { hline, text } from '#/drawing/prims'
import { arrowHead } from '#/drawing/primitives/arrow-head'
import { DIM_RATIO } from '#/drawing/primitives/dimension'
import { measure } from '#/drawing/text-metrics'
import type { Prim, Pt } from '#/drawing/types'

// Section mark (A, B, C on the vertical section): a large letter standing on a short
// horizontal line that marks the cut, and a thin stroke just right of the letter coming
// down onto the line with an arrow (the viewing direction). Sizes from the reference
// section sheet.

export const SECTION_MARK = {
  size: 9,
  length: 14,
  /** Letter baseline above the line, per em. */
  rise: 0.33,
  /** Viewing stroke: gap after the letter, height above the line, arrow length (per em). */
  pointer: { gap: 0.09, rise: 1.42, arrow: 0.1 },
} as const

export type SectionMarkOpts = {
  size?: number
  length?: number
  /** Draw the viewing stroke (default true). */
  pointer?: boolean
}

/** Mark whose line starts at `at` (sheet mm) and runs right. */
export function sectionMark(
  at: Pt,
  letter: string,
  o: SectionMarkOpts = {},
): Array<Prim> {
  const size = o.size ?? SECTION_MARK.size
  const length = o.length ?? SECTION_MARK.length
  const out: Array<Prim> = [
    text(at.x, at.y - SECTION_MARK.rise * size, letter, size),
    hline(at.y, at.x, at.x + length, 'medium'),
  ]
  if (o.pointer ?? true) {
    const P = SECTION_MARK.pointer
    const x = at.x + measure(letter, size) + P.gap * size
    const tip = { x, y: at.y }
    const arrow = P.arrow * size
    out.push(
      {
        kind: 'line',
        a: { x, y: at.y - P.rise * size },
        b: tip,
        weight: 'thin',
      },
      arrowHead(tip, { x: 0, y: 1 }, arrow, arrow * DIM_RATIO.arrowWidth),
    )
  }
  return out
}
