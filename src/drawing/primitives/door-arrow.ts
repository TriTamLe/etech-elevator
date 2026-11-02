import { underlinedText } from '#/drawing/prims'
import type { Prim, Pt } from '#/drawing/types'

// "Hướng cửa vào thang máy": two equal open triangles, the second shifted back along the
// arrow, pointing into the lift; the label sits underlined below. Sizes default to the
// reference plan sheet (measured at 150 dpi).

export const DOOR_ARROW = {
  width: 22.5,
  height: 7.3,
  /** Second triangle's shift away from the tip. */
  shift: 2.5,
  label: 'Hướng cửa vào thang máy',
  size: 8,
  /** Label baseline below the arrow's far end, per em. */
  labelDrop: 1.5,
} as const

export type DoorArrowOpts = {
  width?: number
  height?: number
  shift?: number
  /** Direction the arrow points: 0 up (default), 90 right, 180 down, 270 left. */
  rotate?: 0 | 90 | 180 | 270
  /** `null` draws no label. */
  label?: string | null
  size?: number
}

/** Arrow with its tip at `tip` (sheet mm). */
export function doorArrow(tip: Pt, o: DoorArrowOpts = {}): Array<Prim> {
  const w = o.width ?? DOOR_ARROW.width
  const h = o.height ?? DOOR_ARROW.height
  const shift = o.shift ?? DOOR_ARROW.shift
  const turns = (o.rotate ?? 0) / 90
  // Built pointing up (tip at the origin), then turned clockwise about the tip.
  const turn = (x: number, y: number): Pt => {
    for (let i = 0; i < turns; i++) [x, y] = [-y, x]
    return { x: tip.x + x, y: tip.y + y }
  }
  const tri = (dy: number): Prim => ({
    kind: 'polyline',
    pts: [turn(0, dy), turn(w / 2, dy + h), turn(-w / 2, dy + h)],
    closed: true,
    weight: 'thin',
  })
  const out: Array<Prim> = [tri(0), tri(shift)]
  const label = o.label === undefined ? DOOR_ARROW.label : o.label
  if (label) {
    const size = o.size ?? DOOR_ARROW.size
    // Below the arrow's lowest point, whichever way it points.
    const pts = [turn(0, 0), turn(w / 2, shift + h), turn(-w / 2, shift + h)]
    const bottom = Math.max(...pts.map((p) => p.y))
    // Centred under the arrow's body (off the tip when it points sideways).
    const xs = pts.map((p) => p.x)
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2
    out.push(
      ...underlinedText(cx, bottom + DOOR_ARROW.labelDrop * size, label, size, {
        anchor: 'middle',
      }),
    )
  }
  return out
}
