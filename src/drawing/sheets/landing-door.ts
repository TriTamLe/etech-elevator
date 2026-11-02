import { JAMB } from '#/domain/config'
import { landingOpening } from '#/domain/derive'
import type { Derived } from '#/domain/derive'
import type { ElevatorParams, JambType } from '#/domain/schema'
import { fittedText } from '#/drawing/prims'
import {
  dim,
  dimChain,
  dimStyle,
  doorArrow,
  hatch,
  leader,
  prefixLabel,
  shiftView,
  toSheet,
  zigzagBreak,
} from '#/drawing/primitives'
import type { DimStyle, View } from '#/drawing/primitives'
import {
  box,
  cadSize,
  callBoxHole,
  callBoxPlan,
  landingDoorFront,
  cadText,
  fitFigure,
  walls,
} from '#/drawing/sheets/figure'
import type { CallBoxHole } from '#/drawing/sheets/figure'
import { LANDING, MIN_TEXT_SHARE } from '#/drawing/sheets/figure-layout'
import { placeSymbol, symbol } from '#/drawing/symbols'
import { fitSize, measure } from '#/drawing/text-metrics'
import type { Prim, Pt } from '#/drawing/types'

// DTP 06/07 — Chừa thô & hoàn thiện cửa tầng, one sheet per jamb type in use. Left: the
// rough opening the builder leaves (front elevation over the cut plan); right: the same
// opening finished with jamb, door and call box. Title under both.

export const LANDING_TITLE = 'CHỪA THÔ & HOÀN THIỆN CỬA TẦNG'
export const LANDING_NOTE = [
  'Phần chừa trống lắp cửa tầng',
  'Khách hàng thực hiện',
] as const
/** Jamb type over the opening (the DWG's fixed text). */
export const JAMB_LABEL: Record<JambType, string> = {
  wide: 'Wide jamb GF (JD320)',
  narrow: 'Narrow jamb nF (35x50)',
}
const JAMB_WORDS: Record<JambType, string> = {
  wide: 'bao che rộng',
  narrow: 'bao che hẹp',
}

/** "Tầng 2F ~ 5F : bao che hẹp". */
export function landingSubtitle(d: Derived, jamb: JambType): string {
  return [d.jambFloors[jamb], JAMB_WORDS[jamb]].filter(Boolean).join(' : ')
}

type Geo = {
  jamb: JambType
  AH: number
  W: number
  side: number
  openL: number
  openR: number
  cx: number
  /** Rough opening height and the lintel over it. */
  H: number
  lintel: number
  OP: number
  HH: number
  /** Call box hole in the right wall piece (elevation y), null when it has no size. */
  hole: CallBoxHole | null
}

function geometry(p: ElevatorParams, jamb: JambType): Geo {
  const AH = p.tech.shaft.width
  const opening = landingOpening(p, jamb)
  const side = Math.max(0, opening.side)
  const H = p.structure.roughOpeningHeight
  return {
    jamb,
    AH,
    W: p.structure.wall,
    side,
    openL: side,
    openR: AH - side,
    cx: AH / 2,
    H,
    lintel: p.structure.lintel,
    OP: p.tech.door.width,
    HH: p.tech.door.height,
    hole: callBoxHole(p, side),
  }
}

const line = (v: View, a: Pt, b: Pt, weight: 'thin' | 'medium'): Prim => ({
  kind: 'line',
  a: toSheet(v, a),
  b: toSheet(v, b),
  weight,
})

/** Front elevation shell: columns, brick beside the opening (call box hole cut), lintel. */
function elevationWalls(v: View, g: Geo): Array<Prim> {
  const { AH, W, side, openR, cx, H, lintel } = g
  const top = H + lintel + LANDING.above
  const L = LANDING.hatch
  const out: Array<Prim> = [
    ...walls(
      v,
      [
        box(-W, -top, W, top),
        box(AH, -top, W, top),
        box(0, -(H + lintel), AH, lintel),
      ],
      'AR-CONC',
      L.concrete,
    ),
  ]
  if (side > 0) {
    const hole = g.hole
    out.push(
      ...hatch(v, [box(0, -H, side, H)], 'AR-BRSTD', {
        scale: L.brick,
        outline: 'medium',
      }),
      ...hatch(
        v,
        hole
          ? [
              box(openR, -H, side, H),
              box(hole.x0, hole.y1, hole.x1 - hole.x0, hole.y0 - hole.y1),
            ]
          : [box(openR, -H, side, H)],
        'AR-BRSTD',
        { scale: L.brick, outline: 'medium' },
      ),
    )
  }
  out.push(
    line(v, { x: 0, y: 0 }, { x: AH, y: 0 }, 'medium'),
    ...zigzagBreak(
      toSheet(v, { x: -W, y: -top }),
      toSheet(v, { x: AH + W, y: -top }),
      {
        half: LANDING.breakHalf * v.scale,
        amp: LANDING.breakAmp * v.scale,
        overshoot: LANDING.breakOver * v.scale,
      },
    ),
    line(
      v,
      { x: cx, y: LANDING.centreBelow },
      { x: cx, y: -(H + lintel) },
      'thin',
    ),
  )
  // Jamb type above the lintel, shrunk to the shaft width if needed.
  const label = JAMB_LABEL[g.jamb]
  const size = cadSize(v, LANDING.text.jamb)
  const at = toSheet(v, { x: cx, y: -(H + lintel + LANDING.jambLabelUp) })
  out.push(
    ...fittedText(
      at.x,
      at.y,
      label,
      AH * v.scale,
      size,
      size * MIN_TEXT_SHARE,
      {
        anchor: 'middle',
      },
    ),
  )
  return out
}

/** Cut plan of the front wall: columns, brick beside the opening, side wall stubs. */
function planWalls(v: View, g: Geo): Array<Prim> {
  const { AH, W, side, openL, openR, cx } = g
  const depth = LANDING.planDepth
  const L = LANDING.hatch
  // The narrow-jamb plans hatch their brick with BRSTONE (as in the DWG).
  const [brick, scale] =
    g.jamb === 'narrow'
      ? (['BRSTONE', L.brstone] as const)
      : (['AR-BRSTD', L.brick] as const)
  const out: Array<Prim> = [
    ...walls(v, [box(-W, 0, W, W), box(AH, 0, W, W)], 'AR-CONC', L.concrete),
  ]
  // Call box hole in the right piece, open to the landing: left out of its hatch.
  const boxHole = g.hole && callBoxPlan(v, g.hole, W)
  if (side > 0)
    out.push(
      ...walls(v, [box(0, 0, side, W)], brick, scale),
      ...hatch(
        v,
        [box(openR, 0, side, W), ...(boxHole ? [boxHole.ring] : [])],
        brick,
        { scale, outline: 'medium' },
      ),
    )
  // Side walls behind: outlined full thickness, brick on the outer half (as drawn).
  for (const x of [-W, AH]) {
    out.push({
      kind: 'polyline',
      pts: box(x, -depth, W, depth).map((q) => toSheet(v, q)),
      closed: true,
      weight: 'medium',
    })
  }
  out.push(
    ...hatch(
      v,
      [box(-W, -depth, W / 2, depth), box(AH + W / 2, -depth, W / 2, depth)],
      brick,
      { scale },
    ),
    {
      kind: 'polyline',
      pts: box(openL, 0, openR - openL, W).map((q) => toSheet(v, q)),
      closed: true,
      weight: 'thin',
    },
    ...zigzagBreak(
      toSheet(v, { x: -W, y: -depth }),
      toSheet(v, { x: AH + W, y: -depth }),
      {
        half: LANDING.breakHalf * v.scale,
        amp: LANDING.breakAmp * v.scale,
        overshoot: LANDING.breakOver * v.scale,
      },
    ),
    line(
      v,
      { x: cx, y: -LANDING.planCentreIn },
      { x: cx, y: W + LANDING.planCentreOut },
      'thin',
    ),
  )
  if (boxHole) out.push(...boxHole.prims)
  return out
}

/**
 * The hole's width text is wider than the hole: move it out past the arrow tail instead
 * of over the extension lines: left over the empty opening on the rough elevation, right
 * onto the wall beside the hole on the finished one (clear of the jamb), as on the
 * reference.
 */
function holeTextShift(
  w: number,
  v: View,
  st: DimStyle,
  toward: -1 | 1,
): number {
  const span = w * v.scale
  const tw = measure(String(Math.round(w)), st.text)
  if (tw + 2 * st.arrow <= span) return 0
  return toward * (span / 2 + tw / 2 + 2 * st.arrow + st.gap)
}

/** Rough opening: elevation (`v`) over its plan (`pv`). */
function drawRough(v: View, pv: View, g: Geo): Array<Prim> {
  const { AH, W, openL, openR, cx, H, lintel } = g
  const D = LANDING.dims
  const st = dimStyle(cadSize(v, LANDING.text.dim))
  const out: Array<Prim> = [...elevationWalls(v, g)]

  // Upright note in the opening, either side of the centre line, reading up.
  const noteSize = cadSize(v, LANDING.text.note)
  const room = Math.max(0, H - LANDING.upNote.from) * v.scale
  const longest = LANDING_NOTE.reduce((a, b) =>
    measure(a, noteSize) >= measure(b, noteSize) ? a : b,
  )
  const upSize = fitSize(longest, room, noteSize, noteSize * MIN_TEXT_SHARE)
  LANDING_NOTE.forEach((t, i) => {
    const at = toSheet(v, {
      x: cx + (i === 0 ? -LANDING.upNote.left : LANDING.upNote.right),
      y: -LANDING.upNote.from,
    })
    out.push(
      ...fittedText(at.x, at.y, t, room, upSize, upSize, { rotate: -90 }),
    )
  })

  const hole = g.hole
  out.push(
    ...dimChain(
      v,
      [
        { x: -W, y: 0 },
        { x: openL, y: -H },
        { x: openL, y: -(H + lintel) },
      ],
      { dir: 'v', offset: -D.roughHeight * v.scale, style: st },
    ),
    ...dimChain(
      v,
      [
        { x: 0, y: 0 },
        { x: openL, y: 0 },
        { x: openR, y: 0 },
        { x: AH, y: 0 },
      ],
      { dir: 'h', offset: D.roughBottom * v.scale, style: st },
    ),
  )
  if (hole)
    out.push(
      ...dimChain(
        v,
        [
          { x: AH + W, y: 0 },
          { x: hole.x1, y: hole.y0 },
          { x: hole.x1, y: hole.y1 },
        ],
        { dir: 'v', offset: D.callBoxSide * v.scale, style: st },
      ),
      ...dim(
        v,
        { x: hole.x0, y: hole.y1 },
        { x: hole.x1, y: hole.y1 },
        {
          dir: 'h',
          offset: -D.callBoxTop * v.scale,
          style: st,
          textShift: holeTextShift(hole.x1 - hole.x0, v, st, -1),
        },
      ),
    )

  // Plan: note pointing into the opening, side | LỖ CHỜ | side and AH below.
  out.push(...planWalls(pv, g))
  const size = cadSize(pv, LANDING.text.note)
  const N = LANDING.planNote
  const at = toSheet(pv, { x: cx - N.left, y: -N.baseline })
  out.push(
    ...leader(
      toSheet(pv, { x: Math.max(openL, cx - N.tipX), y: W - N.tipIn }),
      at,
      [...LANDING_NOTE],
      { size, star: false, attach: 'start' },
    ),
    ...dimChain(
      pv,
      [
        { x: 0, y: W },
        { x: openL, y: W },
        { x: openR, y: W },
        { x: AH, y: W },
      ],
      {
        dir: 'h',
        offset: D.planChain * pv.scale,
        style: st,
        labels: [undefined, prefixLabel('LỖ CHỜ = ')],
      },
    ),
    ...dim(
      pv,
      { x: 0, y: W },
      { x: AH, y: W },
      {
        dir: 'h',
        offset: D.planAh * v.scale,
        style: st,
        label: prefixLabel('Hoistway Width AH '),
      },
    ),
  )
  return out
}

/** Finished opening: jamb, door, call box (+ floor indicator), elevation over plan. */
function drawFinished(v: View, pv: View, g: Geo): Array<Prim> {
  const { AH, W, openL, openR, cx, H, OP, HH } = g
  const D = LANDING.dims
  const L = LANDING.hatch
  const frame = JAMB.frame[g.jamb]
  const dOp = OP - LANDING.baseOp
  const st = dimStyle(cadSize(v, LANDING.text.dim))
  const out: Array<Prim> = [...elevationWalls(v, g)]

  // Band between the rough opening and the jamb frame (the frame's own size, clamped to
  // the opening: an oversize wide jamb is a form warning, drawn over the brick).
  const jx0 = Math.max(openL, cx - (OP + frame.extra) / 2)
  const jx1 = Math.min(openR, cx + (OP + frame.extra) / 2)
  const jh = Math.min(H, HH + frame.head)
  out.push(
    ...hatch(
      v,
      [
        [
          { x: openL, y: 0 },
          { x: openL, y: -H },
          { x: openR, y: -H },
          { x: openR, y: 0 },
          { x: jx1, y: 0 },
          { x: jx1, y: -jh },
          { x: jx0, y: -jh },
          { x: jx0, y: 0 },
        ],
      ],
      'ANSI32',
      { scale: L.frame, outline: 'thin' },
    ),
  )
  out.push(...landingDoorFront(v, g.jamb, OP, HH, g.hole, cx))
  const hole = g.hole
  if (hole) {
    // The narrow sheet repeats the hole's width and height here (M5; M6 does not).
    if (g.jamb === 'narrow')
      out.push(
        ...dim(
          v,
          { x: hole.x0, y: hole.y1 },
          { x: hole.x1, y: hole.y1 },
          {
            dir: 'h',
            offset: -D.callBoxTop * v.scale,
            style: st,
            textShift: holeTextShift(hole.x1 - hole.x0, v, st, 1),
          },
        ),
        ...dim(
          v,
          { x: hole.x1, y: hole.y0 },
          { x: hole.x1, y: hole.y1 },
          {
            dir: 'v',
            offset: (AH + W + D.callBoxSide - hole.x1) * v.scale,
            style: st,
          },
        ),
      )
  }

  // Elevation dimensions: HH (+ the wide jamb's head), rough height, OP at the floor,
  // side | opening | side and AH below.
  out.push(
    ...dimChain(
      v,
      g.jamb === 'wide'
        ? [
            { x: -W, y: 0 },
            { x: cx - OP / 2, y: -HH },
            { x: cx - (OP + frame.extra) / 2, y: -(HH + frame.head) },
          ]
        : [
            { x: -W, y: 0 },
            { x: cx - OP / 2, y: -HH },
          ],
      {
        dir: 'v',
        offset: -D.hh * v.scale,
        style: st,
        labels: [prefixLabel('HH ')],
      },
    ),
    ...dim(
      v,
      { x: -W, y: 0 },
      { x: openL, y: -H },
      { dir: 'v', offset: -D.finishedHeight * v.scale, style: st },
    ),
    ...dim(
      v,
      { x: cx - OP / 2, y: 0 },
      { x: cx + OP / 2, y: 0 },
      {
        dir: 'h',
        offset: 0,
        style: st,
        ext: 'none',
        label: prefixLabel('OP='),
      },
    ),
    ...dimChain(
      v,
      [
        { x: 0, y: 0 },
        { x: openL, y: 0 },
        { x: openR, y: 0 },
        { x: AH, y: 0 },
      ],
      { dir: 'h', offset: D.finishedBottom * v.scale, style: st },
    ),
    ...dim(
      v,
      { x: 0, y: 0 },
      { x: AH, y: 0 },
      {
        dir: 'h',
        offset: D.elevationAh * v.scale,
        style: st,
        label: prefixLabel('Hoistway Width AH '),
      },
    ),
  )

  // Plan: door and sills (each leaf stretched), the wide jamb's plates, OP and AH.
  out.push(
    ...planWalls(pv, g),
    ...placeSymbol(symbol('door-co-plan'), {
      at: toSheet(pv, { x: cx, y: 0 }),
      scale: pv.scale,
      stretch: { x: dOp / 2 },
    }),
  )
  if (g.jamb === 'wide') {
    const plate = symbol('jamb-wide-plan')
    const off = -LANDING.jambPlan.x + dOp / 2
    for (const s of [-1, 1])
      out.push(
        ...placeSymbol(plate, {
          at: toSheet(pv, { x: cx + s * off, y: LANDING.jambPlan.y }),
          scale: pv.scale,
          mirrorX: s > 0,
        }),
      )
  }
  out.push(
    ...dim(
      pv,
      { x: cx - OP / 2, y: 0 },
      { x: cx + OP / 2, y: 0 },
      {
        dir: 'h',
        offset: (W + D.planOp) * v.scale,
        style: st,
        label: prefixLabel('OP='),
      },
    ),
    ...dim(
      pv,
      { x: 0, y: W },
      { x: AH, y: W },
      {
        dir: 'h',
        offset: D.planAh * v.scale,
        style: st,
        label: prefixLabel('Hoistway Width AH '),
      },
    ),
  )
  return out
}

function drawLanding(d: Derived, g: Geo, v: View): Array<Prim> {
  const dx = g.AH + 2 * g.W + LANDING.columnGap
  const planY = LANDING.planGap
  const fv = shiftView(v, dx, 0)
  const out: Array<Prim> = [
    ...drawRough(v, shiftView(v, 0, planY), g),
    ...drawFinished(fv, shiftView(fv, 0, planY), g),
  ]

  // Door arrow and the two title lines, centred under both figures.
  const C = LANDING.caption
  const cx = (dx + g.AH) / 2
  const base = planY + g.W + C.base
  out.push(
    ...doorArrow(toSheet(v, { x: cx, y: base - C.shift - C.height }), {
      width: C.width * v.scale,
      height: C.height * v.scale,
      shift: C.shift * v.scale,
      label: null,
    }),
    ...cadText(v, cx, base + C.top, LANDING_TITLE, LANDING.text.title, {
      anchor: 'middle',
    }),
    ...cadText(
      v,
      cx,
      base + C.top + C.pitch,
      landingSubtitle(d, g.jamb),
      LANDING.text.title,
      { anchor: 'middle' },
    ),
  )
  return out
}

/** DTP 06/07 body: rough and finished landing opening for one jamb type. */
export function landingSheet(
  p: ElevatorParams,
  d: Derived,
  jamb: JambType,
): Array<Prim> {
  const g = geometry(p, jamb)
  return fitFigure((v) => drawLanding(d, g, v)).prims
}
