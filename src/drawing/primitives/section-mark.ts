import { hline, text } from '#/drawing/prims'
import type { Prim, Pt } from '#/drawing/types'

// Section mark (A, B, C on the vertical section): a large letter standing on a short
// horizontal line that marks the cut. Sizes from the reference section sheet.

export const SECTION_MARK = {
  size: 9,
  length: 14,
  /** Letter baseline above the line, per em. */
  rise: 0.33,
} as const

export type SectionMarkOpts = { size?: number; length?: number }

/** Mark whose line starts at `at` (sheet mm) and runs right. */
export function sectionMark(
  at: Pt,
  letter: string,
  o: SectionMarkOpts = {},
): Array<Prim> {
  const size = o.size ?? SECTION_MARK.size
  const length = o.length ?? SECTION_MARK.length
  return [
    text(at.x, at.y - SECTION_MARK.rise * size, letter, size),
    hline(at.y, at.x, at.x + length, 'medium'),
  ]
}
