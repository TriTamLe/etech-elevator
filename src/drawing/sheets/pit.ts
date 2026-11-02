import type { Derived } from '#/domain/derive'
import type { ElevatorParams } from '#/domain/schema'
import {
  dim,
  dimStyle,
  hatch,
  leader,
  prefixLabel,
  toSheet,
} from '#/drawing/primitives'
import type { View } from '#/drawing/primitives'
import { UNDERLINE_DROP } from '#/drawing/prims'
import {
  HATCH_SCALE,
  box,
  cadSize,
  caption,
  fitFigure,
  walls,
} from '#/drawing/sheets/figure'
import {
  CAD_TEXT,
  CAPTION,
  MIN_TEXT_SHARE,
  PIT,
} from '#/drawing/sheets/figure-layout'
import { fitSize, measure } from '#/drawing/text-metrics'
import type { Prim } from '#/drawing/types'

// DTP 04 — Mặt cắt Pit hố thang: section C-C through the pit (concrete walls and slab,
// the ground-floor slab ledge, waterproofing note, PIT depth) above the pit plan, both on
// the same x axis (inner face of the left wall = 0).

export const PIT_TITLE = 'MẶT CẮT C-C'
export const PIT_NOTE = 'Chống thấm Pit hố thang'

function drawPit(p: ElevatorParams, v: View): Array<Prim> {
  const AH = p.tech.shaft.width
  const BH = p.tech.shaft.depth
  const W = PIT.slab
  const depth = p.tech.pit
  const st = dimStyle(cadSize(v, CAD_TEXT.dim))
  const out: Array<Prim> = []

  // Plan of the pit: concrete walls all round, corner pieces, inner AH × BH.
  out.push(
    ...walls(
      v,
      [
        box(0, -W, AH, W),
        box(0, BH, AH, W),
        box(-W, 0, W, BH),
        box(AH, 0, W, BH),
        box(-W, -W, W, W),
        box(AH, -W, W, W),
        box(-W, BH, W, W),
        box(AH, BH, W, W),
      ],
      'AR-CONC',
      HATCH_SCALE.pitConcrete,
    ),
    ...dim(
      v,
      { x: 0, y: BH - PIT.planWidthDim },
      { x: AH, y: BH - PIT.planWidthDim },
      {
        dir: 'h',
        offset: 0,
        style: st,
        ext: 'none',
      },
    ),
    ...dim(
      v,
      { x: PIT.planDepthDimX, y: 0 },
      { x: PIT.planDepthDimX, y: BH },
      {
        dir: 'v',
        offset: 0,
        style: st,
        ext: 'none',
      },
    ),
  )

  // Section C-C above: top = ground floor level, slab bottom PIT.gap above the plan.
  const slabBottom = -W - PIT.gap
  const top = slabBottom - W - depth
  const floor = top + depth
  const L = -W
  const ledge = [
    { x: L - PIT.ledgeReach, y: top },
    { x: 0, y: top },
    { x: 0, y: floor },
    { x: AH, y: floor },
    { x: AH, y: top },
    { x: AH + W, y: top },
    { x: AH + W, y: slabBottom },
    { x: L, y: slabBottom },
    { x: L, y: top + PIT.ledgeThick },
    { x: L - PIT.ledgeReach + PIT.ledgeBevel, y: top + PIT.ledgeThick },
  ]
  out.push(
    ...hatch(v, [ledge], 'AR-CONC', {
      scale: HATCH_SCALE.pitConcrete,
      outline: 'medium',
    }),
    ...dim(
      v,
      { x: AH + W, y: top },
      { x: AH + W, y: floor },
      {
        dir: 'v',
        offset: PIT.pitDim * v.scale,
        style: st,
        label: prefixLabel('PIT = '),
      },
    ),
  )
  // Waterproofing note pointing at both walls and the floor, shrunk to the pit width.
  const first = `*${PIT_NOTE}`
  const full = cadSize(v, CAD_TEXT.pitNote)
  // Centred PIT.noteX right of the pit centre: the room is the pit less twice that.
  const room = Math.max(0, AH - 2 * PIT.noteX) * v.scale
  const size = fitSize(first, room, full, full * MIN_TEXT_SHARE)
  const w = measure(first, size)
  const under = toSheet(v, {
    x: AH / 2 + PIT.noteX,
    y: top + depth * PIT.noteShare,
  })
  const sideY = top + depth * PIT.noteTargetShare
  out.push(
    ...leader(
      [
        toSheet(v, { x: 0, y: sideY }),
        toSheet(v, { x: AH / 2, y: floor }),
        toSheet(v, { x: AH, y: sideY }),
      ],
      { x: under.x - w / 2, y: under.y - UNDERLINE_DROP * size },
      [PIT_NOTE],
      { size },
    ),
  )

  out.push(...caption(v, AH / 2, BH + W, CAPTION.pit, PIT_TITLE))
  return out
}

/** DTP 04 body: pit section and plan fitted into the framed sheet's drawing area. */
export function pitSheet(p: ElevatorParams, _d: Derived): Array<Prim> {
  return fitFigure((v) => drawPit(p, v)).prims
}
