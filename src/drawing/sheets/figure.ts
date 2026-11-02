import type { ElevatorParams, JambType } from '#/domain/schema'
import { SHEET_AREA } from '#/drawing/frame/layout'
import { text, underlinedText } from '#/drawing/prims'
import { doorArrow, fitScale, hatch, toSheet, view } from '#/drawing/primitives'
import type { HatchName, View } from '#/drawing/primitives'
import { CAD_TEXT, LANDING } from '#/drawing/sheets/figure-layout'
import type { CaptionGeometry } from '#/drawing/sheets/figure-layout'
import { placeSymbol, symbol } from '#/drawing/symbols'
import { ascent, descent, measure } from '#/drawing/text-metrics'
import type { FontStyle } from '#/drawing/text-metrics'
import type { Prim, Pt } from '#/drawing/types'

// Shared plumbing of the figure sheets: real-size text, fitting a whole figure (its
// annotations included) into the drawing area, hatched walls and the caption under it.

/** Sheet font size (em) of AutoCAD text `h` real mm high, drawn in view `v`. */
export function cadSize(v: View, h: number): number {
  return CAD_TEXT.emPerHeight * h * v.scale
}

/** Sheet text whose TOP sits at real `top` (as AutoCAD MTEXT is placed). */
export function cadText(
  v: View,
  x: number,
  top: number,
  value: string,
  h: number,
  opts: FontStyle & {
    anchor?: 'start' | 'middle' | 'end'
    underline?: boolean
  } = {},
): Array<Prim> {
  const { underline, ...style } = opts
  const p = toSheet(v, { x, y: top + CAD_TEXT.topToBaseline * h })
  const size = cadSize(v, h)
  return underline
    ? underlinedText(p.x, p.y, value, size, style)
    : [text(p.x, p.y, value, size, style)]
}

export type Bounds = { x: number; y: number; w: number; h: number }

/** Sheet bounds of prims, text included (measured, rotation by quarter turns). */
export function primsBounds(prims: ReadonlyArray<Prim>): Bounds | null {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  const add = (x: number, y: number) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return
    x0 = Math.min(x0, x)
    y0 = Math.min(y0, y)
    x1 = Math.max(x1, x)
    y1 = Math.max(y1, y)
  }
  for (const p of prims) {
    switch (p.kind) {
      case 'line':
        add(p.a.x, p.a.y)
        add(p.b.x, p.b.y)
        break
      case 'rect':
      case 'image':
        add(p.x, p.y)
        add(p.x + p.w, p.y + p.h)
        break
      case 'circle':
      case 'arc':
        add(p.c.x - p.r, p.c.y - p.r)
        add(p.c.x + p.r, p.c.y + p.r)
        break
      case 'polyline':
        for (const q of p.pts) add(q.x, q.y)
        break
      case 'lines':
        for (let i = 0; i + 1 < p.segs.length; i += 2)
          add(p.segs[i], p.segs[i + 1])
        break
      case 'text': {
        const w = measure(p.text, p.size, p)
        const a = p.anchor ?? 'start'
        const u0 = a === 'start' ? 0 : a === 'middle' ? -w / 2 : -w
        const [up, down] = [ascent(p.size), descent(p.size)]
        // Corners in text space (along, across; y down), turned by `rotate`.
        const r = ((p.rotate ?? 0) * Math.PI) / 180
        const [c, s] = [Math.cos(r), Math.sin(r)]
        for (const [u, v] of [
          [u0, -up],
          [u0 + w, -up],
          [u0, down],
          [u0 + w, down],
        ])
          add(p.x + u * c - v * s, p.y + u * s + v * c)
        break
      }
    }
  }
  return Number.isFinite(x0) ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null
}

/** Sheet mm kept clear between a figure and the drawing area's edge. */
const FIT_PAD = 4

/**
 * Draw a figure at the largest allowed scale that fits the sheet's drawing area. Every
 * part of a figure (walls, dimensions, text) is sized in real mm, so its extent at
 * 1:1 divided by n is its extent at 1:n: draw once at 1:1 to measure, then for real.
 *
 * `aside` (side notes) must fit too but does not take part in centring: the figure
 * stays centred across the area as far as the notes allow.
 */
export function fitFigure(
  draw: (v: View) => Array<Prim>,
  aside?: (v: View) => Array<Prim>,
): { view: View; prims: Array<Prim> } {
  const one = view(1, { x: 0, y: 0 })
  const probe = draw(one)
  const main = primsBounds(probe)
  const all = primsBounds([...probe, ...(aside?.(one) ?? [])])
  const fitted = fitScale(all ?? { x: 0, y: 0, w: 0, h: 0 }, {
    area: SHEET_AREA,
    pad: FIT_PAD,
  })
  let v: View = fitted
  if (aside && main && all) {
    // Shift across so the main figure is centred, clamped to keep everything inside.
    const k = fitted.scale
    const left = SHEET_AREA.left + FIT_PAD
    const right = SHEET_AREA.right - FIT_PAD
    const allX0 = fitted.origin.x + all.x * k
    const allX1 = allX0 + all.w * k
    const mainMid = fitted.origin.x + (main.x + main.w / 2) * k
    const want = (left + right) / 2 - mainMid
    const dx = Math.min(Math.max(want, left - allX0), right - allX1)
    v = view(fitted.n, { x: fitted.origin.x + dx, y: fitted.origin.y })
  }
  return { view: v, prims: [...draw(v), ...(aside?.(v) ?? [])] }
}

/** Real rectangle → polygon ring. */
export function box(x: number, y: number, w: number, h: number): Array<Pt> {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ]
}

/** Pattern scales of the reference sheets. */
export const HATCH_SCALE = { brick: 20, concrete: 10, pitConcrete: 20 } as const

/** Hatched, outlined wall pieces (real rectangles). */
export function walls(
  v: View,
  rects: ReadonlyArray<Array<Pt>>,
  name: HatchName,
  scale: number,
): Array<Prim> {
  return rects.flatMap((r) => hatch(v, [r], name, { scale, outline: 'medium' }))
}

/**
 * Door arrow, "Hướng cửa vào thang máy" and the underlined title under a figure, centred
 * on real x `cx`, measured from the front wall's outer face `front` (real y).
 */
export function caption(
  v: View,
  cx: number,
  front: number,
  g: CaptionGeometry,
  title: string | null,
): Array<Prim> {
  const base = front + g.base
  const tip = toSheet(v, { x: cx, y: base - g.shift - g.height })
  const out: Array<Prim> = [
    ...doorArrow(tip, {
      width: g.width * v.scale,
      height: g.height * v.scale,
      shift: g.shift * v.scale,
      label: null,
    }),
    ...cadText(
      v,
      cx,
      base + g.labelTop,
      'Hướng cửa vào thang máy',
      g.labelHeight,
      {
        anchor: 'middle',
        underline: true,
      },
    ),
  ]
  if (title)
    out.push(
      ...cadText(v, cx, base + g.titleTop, title, g.titleHeight, {
        anchor: 'middle',
        underline: true,
      }),
    )
  return out
}

/** Call box hole (real mm): across x0…x1, elevation y0 (bottom) … y1 (top, = −height). */
export type CallBoxHole = { x0: number; x1: number; y0: number; y1: number }

/**
 * The call box hole beside a landing opening whose wall pieces are `side` wide: flush with
 * the opening's right edge, kept inside the right piece and below the rough opening's
 * top. Null when nothing is left of it (no wall piece, no size, or above the opening).
 */
export function callBoxHole(
  p: ElevatorParams,
  side: number,
): CallBoxHole | null {
  const AH = p.tech.shaft.width
  const H = p.structure.roughOpeningHeight
  const cb = p.structure.callBox
  const x0 = AH - Math.max(0, side)
  const x1 = Math.min(x0 + cb.w, AH)
  const y0 = -Math.min(cb.bottom, H)
  const y1 = -Math.min(cb.bottom + cb.h, H)
  return x1 > x0 && y0 > y1 ? { x0, x1, y0, y1 } : null
}

/**
 * The hole in plan: `call-box-plan` (⊠) stretched to the hole's width, open to the
 * landing (flush with the front wall's outer face, real y `front`). `ring` is its
 * outline, to leave out of the wall's hatch.
 */
export function callBoxPlan(
  v: View,
  hole: CallBoxHole,
  front: number,
): { ring: Array<Pt>; prims: Array<Prim> } {
  const sym = symbol('call-box-plan')
  const b = sym.bbox
  const w = hole.x1 - hole.x0
  return {
    ring: box(hole.x0, front - b.h, w, b.h),
    prims: placeSymbol(sym, {
      at: toSheet(v, { x: hole.x0 - b.x, y: front - (b.y + b.h) }),
      scale: v.scale,
      stretch: { x: w - b.w },
    }),
  }
}

/**
 * A finished landing door seen from the front, in a frame with x from the left wall's
 * inner face and y = −height above the landing floor, centred on `cx`: the jamb and the
 * door leaves stretched to OP × HH (the symbols are drawn for OP 700 / HH 2100), each
 * leaf's opening arrow, the call box in its hole and, with the wide jamb, the floor
 * indicator over the door.
 */
export function landingDoorFront(
  v: View,
  jamb: JambType,
  OP: number,
  HH: number,
  hole: CallBoxHole | null,
  cx: number,
): Array<Prim> {
  const dOp = OP - LANDING.baseOp
  const dHh = HH - LANDING.baseHh
  const out: Array<Prim> = [
    // Jamb: one stretch line at its centre, so insert half the stretch to the left.
    ...placeSymbol(
      symbol(jamb === 'wide' ? 'jamb-wide-jd320' : 'jamb-narrow-35x50'),
      {
        at: toSheet(v, { x: cx - dOp / 2, y: 0 }),
        scale: v.scale,
        stretch: { x: dOp, y: dHh },
      },
    ),
    ...placeSymbol(symbol('door-front'), {
      at: toSheet(v, { x: cx, y: 0 }),
      scale: v.scale,
      stretch: { x: dOp / 2, y: dHh },
    }),
  ]
  const arrow = symbol('door-open-arrow')
  for (const s of [-1, 1])
    out.push(
      ...placeSymbol(arrow, {
        at: toSheet(v, { x: cx + (s * OP) / 4, y: -HH / 2 }),
        scale: v.scale,
        mirrorX: s > 0,
      }),
    )
  if (hole)
    out.push(
      ...placeSymbol(symbol('call-box'), {
        at: toSheet(v, {
          x: (hole.x0 + hole.x1) / 2,
          y: (hole.y0 + hole.y1) / 2,
        }),
        scale: v.scale,
      }),
    )
  if (jamb === 'wide') {
    const y = -(HH + LANDING.indicator.up)
    const win = LANDING.indicator.window
    out.push(
      ...hatch(
        v,
        [box(cx - win.w / 2, y - win.h / 2, win.w, win.h)],
        'ANSI34',
        { scale: LANDING.hatch.indicator },
      ),
      ...placeSymbol(symbol('floor-indicator'), {
        at: toSheet(v, { x: cx, y }),
        scale: v.scale,
      }),
    )
  }
  return out
}
