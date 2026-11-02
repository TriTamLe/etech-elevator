import type { PolylinePrim, Pt } from '#/drawing/types'

/**
 * Closed, filled arrowhead (AutoCAD's default "closed filled"): tip at `tip`, pointing
 * along `dir` (any length), `length` long and `width` across its base.
 */
export function arrowHead(
  tip: Pt,
  dir: Pt,
  length: number,
  width: number,
): PolylinePrim {
  const d = Math.hypot(dir.x, dir.y) || 1
  const ux = dir.x / d
  const uy = dir.y / d
  const bx = tip.x - ux * length
  const by = tip.y - uy * length
  const hw = width / 2
  return {
    kind: 'polyline',
    pts: [
      tip,
      { x: bx - uy * hw, y: by + ux * hw },
      { x: bx + uy * hw, y: by - ux * hw },
    ],
    closed: true,
    fill: 'ink',
    weight: 'thin',
  }
}
