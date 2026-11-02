import type { LinePrim, Pt, Weight } from '#/drawing/types'

// Break where the vertical section skips repeated floors: as on the reference set, two
// parallel straight lines right across the drawing, running a little past it.

export type BreakOpts = {
  /** Distance between the two lines (sheet mm). */
  gap?: number
  /** Run past `a` and `b` by this much at each end. */
  overshoot?: number
  weight?: Weight
}

/** Measured on the reference section sheet. */
export const BREAK_GAP = 0.8

export function breakLine(a: Pt, b: Pt, o: BreakOpts = {}): Array<LinePrim> {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const d = Math.hypot(dx, dy)
  if (!Number.isFinite(d) || d === 0) return []
  const [ux, uy] = [dx / d, dy / d]
  const h = (o.gap ?? BREAK_GAP) / 2
  const e = o.overshoot ?? 0
  const weight = o.weight ?? 'medium'
  return [h, -h].map((s) => ({
    kind: 'line',
    a: { x: a.x - ux * e - uy * s, y: a.y - uy * e + ux * s },
    b: { x: b.x + ux * e - uy * s, y: b.y + uy * e + ux * s },
    weight,
  }))
}
