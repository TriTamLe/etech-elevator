import { landingOpening } from '#/domain/derive'
import type { Derived } from '#/domain/derive'
import type { ElevatorParams, JambType } from '#/domain/schema'
import { UNDERLINE_DROP } from '#/drawing/prims'
import {
  dim,
  dimChain,
  dimStyle,
  leader,
  prefixLabel,
  toSheet,
} from '#/drawing/primitives'
import type { View } from '#/drawing/primitives'
import {
  HATCH_SCALE,
  box,
  cadSize,
  cadText,
  caption,
  fitFigure,
  walls,
} from '#/drawing/sheets/figure'
import {
  CAD_TEXT,
  CAPTION,
  DIM_OFFSET,
  PLAN,
} from '#/drawing/sheets/figure-layout'
import { placeSymbol, symbol } from '#/drawing/symbols'
import { measure } from '#/drawing/text-metrics'
import type { Prim, Pt } from '#/drawing/types'

// DTP 03 — Mặt cắt ngang thang máy: the hoistway at a landing, seen from above with the
// landing door at the bottom. Walls, corner columns, car with its rails, counterweight,
// door and sill, the outer dimensions in the set-2 style and the optional infill note.

export const PLAN_TITLE = 'MẶT CẮT CỬA TẦNG'

export const INFILL_NOTE = {
  leader: ['Xây chèn sau', 'khi lắp xong cửa'],
  title: 'Ghi chú :',
  body: [
    '- Phần xây chèn và hoàn thiện bề mặt sau khi nhà thầu',
    'thi công lắp xong cửa thang máy : (CĐT hoặc nhà thầu',
    'xây dựng thực hiện )',
  ],
} as const

/**
 * Jamb type whose opening the plan shows: the typical floor's narrow jamb when any floor
 * uses it (both reference sets), else the wide one.
 */
export function planJamb(d: Derived): JambType {
  return d.openings.narrow || !d.openings.wide ? 'narrow' : 'wide'
}

/** Car outline: outer and inner skins with the entrance in the front, plus its returns. */
function car(
  v: View,
  x0: number,
  y0: number,
  w: number,
  dpt: number,
  op: number,
) {
  const t = PLAN.carWall
  const cx = x0 + w / 2
  const skin = (inset: number, gap: number): Array<Pt> => [
    { x: cx - gap / 2, y: y0 + dpt + t - inset },
    { x: x0 - t + inset, y: y0 + dpt + t - inset },
    { x: x0 - t + inset, y: y0 - t + inset },
    { x: x0 + w + t - inset, y: y0 - t + inset },
    { x: x0 + w + t - inset, y: y0 + dpt + t - inset },
    { x: cx + gap / 2, y: y0 + dpt + t - inset },
  ]
  const outer = skin(0, op + PLAN.carEntranceExtra)
  const inner = skin(t, op)
  const pl = (pts: Array<Pt>): Prim => ({
    kind: 'polyline',
    pts: pts.map((p) => toSheet(v, p)),
    weight: 'thin',
  })
  return [
    pl(outer),
    pl(inner),
    pl([outer[0], inner[0]]),
    pl([outer[5], inner[5]]),
  ]
}

function drawPlan(p: ElevatorParams, d: Derived, v: View): Array<Prim> {
  const AH = p.tech.shaft.width
  const BH = p.tech.shaft.depth
  const W = p.structure.wall
  const { width: CW, depth: CD } = p.tech.car
  const OP = p.tech.door.width
  const opening = landingOpening(p, planJamb(d))
  // No floor with a door leaves the narrow opening unchecked by the rules: keep it sane.
  const side = Math.max(0, opening.side)
  const openL = side
  const openR = AH - side
  const front = BH + W
  const cx = AH / 2
  const st = dimStyle(cadSize(v, CAD_TEXT.dim))
  const out: Array<Prim> = []

  // Walls: brick sides, back and the two front pieces; concrete corner columns.
  out.push(
    ...walls(
      v,
      [
        box(0, -W, AH, W),
        box(-W, 0, W, BH),
        box(AH, 0, W, BH),
        box(0, BH, openL, W),
        box(openR, BH, AH - openR, W),
      ],
      'AR-BRSTD',
      HATCH_SCALE.brick,
    ),
    ...walls(
      v,
      [
        box(-W, -W, W, W),
        box(AH, -W, W, W),
        box(-W, BH, W, W),
        box(AH, BH, W, W),
      ],
      'AR-CONC',
      HATCH_SCALE.concrete,
    ),
  )

  // Landing floor line and the infill wedges up to the jambs.
  const fy = front + PLAN.floorLine
  const line = (a: Pt, b: Pt): Prim => ({
    kind: 'line',
    a: toSheet(v, a),
    b: toSheet(v, b),
    weight: 'thin',
  })
  out.push(
    line({ x: -W, y: fy }, { x: openL + PLAN.floorLineIn, y: fy }),
    line({ x: openR - PLAN.floorLineIn, y: fy }, { x: AH + W, y: fy }),
    line(
      { x: openL + PLAN.floorLineIn, y: fy },
      { x: cx - OP / 2, y: BH + PLAN.wedgeIn },
    ),
    line(
      { x: openR - PLAN.floorLineIn, y: fy },
      { x: cx + OP / 2, y: BH + PLAN.wedgeIn },
    ),
  )

  // Car, centred across; its inner front face PLAN.carFront behind the front wall.
  const carX = (AH - CW) / 2
  const carY = BH - PLAN.carFront - CD
  out.push(...car(v, carX, carY, CW, CD, OP))
  // Car rails beside it, at mid depth; the right one mirrored.
  const railY = carY + CD / 2
  const rail = symbol('rail-t-plan')
  const railOut = PLAN.carWall + PLAN.railOut
  out.push(
    ...placeSymbol(rail, {
      at: toSheet(v, { x: carX - railOut, y: railY }),
      scale: v.scale,
    }),
    ...placeSymbol(rail, {
      at: toSheet(v, { x: carX + CW + railOut, y: railY }),
      scale: v.scale,
      mirrorX: true,
    }),
  )
  // Counterweight against the back wall, with its two rails.
  out.push(
    ...placeSymbol(symbol('counterweight-plan'), {
      at: toSheet(v, { x: cx, y: PLAN.cwSymbolY }),
      scale: v.scale,
    }),
    ...placeSymbol(rail, {
      at: toSheet(v, { x: cx - PLAN.cwRailX, y: PLAN.cwRailY }),
      scale: v.scale,
    }),
    ...placeSymbol(rail, {
      at: toSheet(v, { x: cx + PLAN.cwRailX, y: PLAN.cwRailY }),
      scale: v.scale,
      mirrorX: true,
    }),
  )
  // Door leaves and sills at the opening's centre: each leaf has its own stretch
  // line, so half the extra width goes to each side and the leaves stay equal.
  out.push(
    ...placeSymbol(symbol('door-co-plan'), {
      at: toSheet(v, { x: cx, y: BH }),
      scale: v.scale,
      stretch: { x: (OP - PLAN.doorBaseOp) / 2 },
    }),
  )

  // Dimensions.
  out.push(
    ...dimChain(
      v,
      [
        { x: -W, y: -W },
        { x: 0, y: -W },
        { x: AH, y: -W },
        { x: AH + W, y: -W },
      ],
      {
        dir: 'h',
        offset: -DIM_OFFSET.top * v.scale,
        style: st,
        labels: [undefined, prefixLabel('Chiều rộng = ')],
      },
    ),
    ...dim(
      v,
      { x: -W, y: -W },
      { x: -W, y: 0 },
      {
        dir: 'v',
        offset: -DIM_OFFSET.side * v.scale,
        style: st,
      },
    ),
    ...dimChain(
      v,
      [
        { x: AH + W, y: -W },
        { x: AH + W, y: 0 },
        { x: AH + W, y: BH },
      ],
      {
        dir: 'v',
        offset: DIM_OFFSET.depth * v.scale,
        style: st,
        labels: [undefined, prefixLabel('Chiều sâu = ')],
      },
    ),
    ...dimChain(
      v,
      [
        { x: 0, y: front },
        { x: openL, y: front },
        { x: openR, y: front },
        { x: AH, y: front },
      ],
      {
        dir: 'h',
        offset: DIM_OFFSET.bottom * v.scale,
        style: st,
        labels: [undefined, prefixLabel('LỖ CHỜ = ')],
      },
    ),
    ...dim(
      v,
      { x: cx - OP / 2, y: front - PLAN.opDim },
      { x: cx + OP / 2, y: front - PLAN.opDim },
      {
        dir: 'h',
        offset: 0,
        style: st,
        label: prefixLabel('OP = '),
        ext: 'none',
      },
    ),
    // Car inside: CW across, CD along.
    ...dim(
      v,
      { x: carX, y: carY + CD * PLAN.cwDimShare },
      { x: carX + CW, y: carY + CD * PLAN.cwDimShare },
      { dir: 'h', offset: 0, style: st, ext: 'none' },
    ),
    ...dim(
      v,
      { x: carX + PLAN.cdDimX, y: carY },
      { x: carX + PLAN.cdDimX, y: carY + CD },
      { dir: 'v', offset: 0, style: st, ext: 'none' },
    ),
  )

  // Caption under the figure (the infill note is drawn aside, see drawInfillNote).
  out.push(...caption(v, cx, front, CAPTION.plan, PLAN_TITLE))
  return out
}

/** "Xây chèn sau…" leader and the "Ghi chú" paragraph, when the infill note is on. */
function drawInfillNote(p: ElevatorParams, v: View): Array<Prim> {
  if (!p.structure.infillNote) return []
  const AH = p.tech.shaft.width
  const front = p.tech.shaft.depth + p.structure.wall
  const cx = AH / 2
  const out: Array<Prim> = []
  const size = cadSize(v, CAD_TEXT.infill)
  const elbow = toSheet(v, {
    x: PLAN.infillElbow.x,
    y: front + PLAN.infillElbow.y,
  })
  const [first, ...rest] = INFILL_NOTE.leader
  out.push(
    ...leader(
      toSheet(v, { x: PLAN.infillTarget.x, y: front + PLAN.infillTarget.y }),
      {
        x: elbow.x - measure(first, size),
        y: elbow.y - UNDERLINE_DROP * size,
      },
      [first, ...rest],
      { size, star: false, head: 'none' },
    ),
  )
  // "Ghi chú" left of the caption, its top level with the arrow label (as on set 2).
  const g = CAPTION.plan
  const realW = (t: string, h: number) => measure(t, cadSize(v, h)) / v.scale
  const captionLeft =
    cx -
    Math.max(
      realW('Hướng cửa vào thang máy', g.labelHeight),
      realW(PLAN_TITLE, g.titleHeight),
    ) /
      2
  const notesW = Math.max(
    ...[INFILL_NOTE.title, ...INFILL_NOTE.body].map((l) =>
      realW(l, CAD_TEXT.infill),
    ),
  )
  const left = captionLeft - PLAN.notesGap - notesW
  let top = front + g.base + g.labelTop
  out.push(
    ...cadText(v, left, top, INFILL_NOTE.title, CAD_TEXT.infill, {
      underline: true,
    }),
  )
  for (const l of INFILL_NOTE.body) {
    top += CAD_TEXT.infill * PLAN.notesLineGap
    out.push(...cadText(v, left, top, l, CAD_TEXT.infill))
  }
  return out
}

/** DTP 03 body: the plan fitted into the framed sheet's drawing area. */
export function planSheet(p: ElevatorParams, d: Derived): Array<Prim> {
  return fitFigure(
    (v) => drawPlan(p, d, v),
    (v) => drawInfillNote(p, v),
  ).prims
}
