import type { Derived, Page } from '#/domain/derive'
import type { ElevatorParams } from '#/domain/schema'

// Drawing primitives. Units are mm on an A3 landscape sheet, origin top-left, y down
// (same as SVG), so the preview and the PDF read the same numbers.

export const SHEET = { width: 420, height: 297 } as const

/** Line weights of the reference set (mm). */
export const STROKE = { thin: 0.13, medium: 0.25, thick: 0.5 } as const
export type Weight = keyof typeof STROKE

export type Pt = { x: number; y: number }

export type LinePrim = {
  kind: 'line'
  a: Pt
  b: Pt
  weight?: Weight
}

export type RectPrim = {
  kind: 'rect'
  x: number
  y: number
  w: number
  h: number
  weight?: Weight
  /** 'ink' fills solid black (ticked box); default is outline only. */
  fill?: 'none' | 'ink'
  /** Corner radius (mm) for a rounded box. */
  r?: number
}

export type CirclePrim = {
  kind: 'circle'
  c: Pt
  r: number
  weight?: Weight
}

/** Open (or `closed`) chain of straight segments: symbol outlines from the DWG. */
export type PolylinePrim = {
  kind: 'polyline'
  pts: Array<Pt>
  closed?: boolean
  weight?: Weight
}

/**
 * Circular arc. Angles in degrees on the sheet (y down, so 0° points right and 90°
 * points down); the arc runs from `start` to `end` with the angle increasing, which on
 * screen is clockwise. `end` may exceed 360 so the arc never wraps through `start`.
 */
export type ArcPrim = {
  kind: 'arc'
  c: Pt
  r: number
  start: number
  end: number
  weight?: Weight
}

export type TextPrim = {
  kind: 'text'
  /** Anchor point; `y` is the baseline. */
  x: number
  y: number
  text: string
  /** Font size (em) in mm. */
  size: number
  anchor?: 'start' | 'middle' | 'end'
  bold?: boolean
  italic?: boolean
}

export type ImagePrim = {
  kind: 'image'
  href: string
  x: number
  y: number
  w: number
  h: number
}

export type Prim =
  | LinePrim
  | RectPrim
  | CirclePrim
  | PolylinePrim
  | ArcPrim
  | TextPrim
  | ImagePrim

/** A sheet function: pure, params in, primitives out. */
export type SheetFn = (p: ElevatorParams, d: Derived, page: Page) => Array<Prim>
