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

export type Prim = LinePrim | RectPrim | CirclePrim | TextPrim | ImagePrim

/** A sheet function: pure, params in, primitives out. */
export type SheetFn = (p: ElevatorParams, d: Derived, page: Page) => Array<Prim>
