import type { Pt } from '#/drawing/types'

// A drawing's mapping from real mm (the building, y down like the sheet) to sheet mm.
// Plain data so tests can compare it; a vertical section passes y = −elevation.

export type View = {
  /** Drawing scale 1:n. */
  n: number
  /** 1 / n: sheet mm per real mm. */
  scale: number
  /** Sheet position of the real-world origin (0, 0). */
  origin: Pt
}

export function view(n: number, origin: Pt): View {
  return { n, scale: 1 / n, origin }
}

/** Sheet point of a real-world point. */
export function toSheet(v: View, p: Pt): Pt {
  return { x: v.origin.x + p.x * v.scale, y: v.origin.y + p.y * v.scale }
}

/** Sheet length of a real length. */
export function len(v: View, mm: number): number {
  return mm * v.scale
}
