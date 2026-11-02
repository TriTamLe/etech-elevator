import type { LinePrim, PolylinePrim, Pt, Weight } from '#/drawing/types'

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

export type ZigzagOpts = {
  /** Half the bump's run along the line (sheet mm). */
  half: number
  /** Bump height each side of the line (sheet mm). */
  amp: number
  /** Bump centre along a→b as a share of its length (default the middle). */
  at?: number
  overshoot?: number
  weight?: Weight
}

/**
 * Break across the top of a wall or a cut plan, as on the landing door sheets: one line
 * with a single "Z" bump (down on the sheet, across, back up), running a little past
 * `a` and `b`.
 */
export function zigzagBreak(a: Pt, b: Pt, o: ZigzagOpts): Array<PolylinePrim> {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const d = Math.hypot(dx, dy)
  if (!Number.isFinite(d) || d === 0) return []
  const [ux, uy] = [dx / d, dy / d]
  // Normal pointing down the sheet for a left-to-right line.
  const [nx, ny] = [-uy, ux]
  const e = o.overshoot ?? 0
  const c = d * (o.at ?? 0.5)
  const pt = (along: number, across: number): Pt => ({
    x: a.x + ux * along + nx * across,
    y: a.y + uy * along + ny * across,
  })
  return [
    {
      kind: 'polyline',
      pts: [
        pt(-e, 0),
        pt(c - o.half, 0),
        pt(c - o.half, o.amp),
        pt(c + o.half, -o.amp),
        pt(c + o.half, 0),
        pt(d + e, 0),
      ],
      weight: o.weight ?? 'thin',
    },
  ]
}
