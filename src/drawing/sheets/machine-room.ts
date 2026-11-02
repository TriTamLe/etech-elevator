import type { Derived } from '#/domain/derive'
import type { ElevatorParams } from '#/domain/schema'
import { UNDERLINE_DROP, fittedText } from '#/drawing/prims'
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
  caption,
  fitFigure,
  walls,
} from '#/drawing/sheets/figure'
import {
  CAD_TEXT,
  CAPTION,
  DIM_OFFSET,
  MACHINE_ROOM,
  MIN_TEXT_SHARE,
} from '#/drawing/sheets/figure-layout'
import { placeSymbol, symbol } from '#/drawing/symbols'
import { ascent, descent, fitSize, measure } from '#/drawing/text-metrics'
import type { Prim, Pt } from '#/drawing/types'

// DTP 08 — Mặt cắt ngang phòng máy (B-B): the top room seen from above. Brick walls with
// concrete corner columns, the machine beams on three sides when that support is chosen,
// the CPM opening in the front wall, the hoist hook with its setting-out dimensions.

export const MACHINE_ROOM_TITLE = 'MẶT CẮT B-B'
export const BEAM_LABEL = 'Dầm đặt máy'
export const HOOK_LABEL = 'vị trí móc treo'

function drawMachineRoom(p: ElevatorParams, d: Derived, v: View): Array<Prim> {
  const AH = p.tech.shaft.width
  const BH = p.tech.shaft.depth
  const W = p.structure.wall
  const half = W / 2
  const beams = p.topRoom.machineSupport === 'beams'
  const cpm = Math.min(p.topRoom.cpm.w, AH)
  const front = BH + W
  const st = dimStyle(cadSize(v, CAD_TEXT.dim))
  const out: Array<Prim> = []
  const line = (a: Pt, b: Pt): Prim => ({
    kind: 'line',
    a: toSheet(v, a),
    b: toSheet(v, b),
    weight: 'medium',
  })

  // Walls. With machine beams, the inner half of the back and side walls is the beam
  // (outlined, unhatched, labelled); otherwise the whole wall is brick.
  const brick = beams
    ? [box(0, -W, AH, half), box(-W, 0, half, BH), box(AH + half, 0, half, BH)]
    : [box(0, -W, AH, W), box(-W, 0, W, BH), box(AH, 0, W, BH)]
  // Front wall right of the CPM opening: brick outer half, plain inner half.
  if (cpm < AH) brick.push(box(cpm, BH + half, AH - cpm, half))
  out.push(
    ...walls(v, brick, 'AR-BRSTD', HATCH_SCALE.brick),
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
  if (cpm < AH)
    out.push({
      kind: 'polyline',
      pts: box(cpm, BH, AH - cpm, half).map((q) => toSheet(v, q)),
      closed: true,
      weight: 'medium',
    })
  if (beams) {
    for (const r of [
      box(0, -half, AH, half),
      box(-half, 0, half, BH),
      box(AH, 0, half, BH),
    ])
      out.push({
        kind: 'polyline',
        pts: r.map((q) => toSheet(v, q)),
        closed: true,
        weight: 'medium',
      })
    const size = cadSize(v, CAD_TEXT.small)
    const mid = (x: number, y: number) => toSheet(v, { x, y })
    const back = mid(AH / 2, -half / 2)
    const left = mid(-half / 2, BH / 2)
    const right = mid(AH + half / 2, BH / 2)
    // Centred in each strip (baseline below the middle by half the glyph box); the
    // side ones read bottom to top, so "below" is to the right.
    const dy = (ascent(size) - descent(size)) / 2
    out.push(
      {
        kind: 'text',
        x: back.x,
        y: back.y + dy,
        text: BEAM_LABEL,
        size,
        anchor: 'middle',
      },
      {
        kind: 'text',
        x: left.x + dy,
        y: left.y,
        text: BEAM_LABEL,
        size,
        anchor: 'middle',
        rotate: -90,
      },
      {
        kind: 'text',
        x: right.x + dy,
        y: right.y,
        text: BEAM_LABEL,
        size,
        anchor: 'middle',
        rotate: -90,
      },
    )
  }

  // CPM opening: wall edges at the opening, the wedge below it and its label.
  out.push(
    line({ x: cpm, y: BH }, { x: cpm, y: front + MACHINE_ROOM.cpmWedge }),
    line({ x: cpm, y: front + MACHINE_ROOM.cpmWedge }, { x: 0, y: front }),
    line({ x: 0, y: BH }, { x: cpm, y: BH }),
  )
  // Label centred in the opening's wall band, shrunk to fit a narrow opening.
  const cpmLabel = `CPM ${p.topRoom.cpm.w} x ${p.topRoom.cpm.h}`
  const cpmAt = toSheet(v, { x: cpm / 2, y: BH + half })
  const cpmSize = fitSize(
    cpmLabel,
    cpm * v.scale,
    cadSize(v, CAD_TEXT.small),
    cadSize(v, CAD_TEXT.small) * MIN_TEXT_SHARE,
  )
  out.push(
    ...fittedText(
      cpmAt.x,
      cpmAt.y + (ascent(cpmSize) - descent(cpmSize)) / 2,
      cpmLabel,
      cpm * v.scale,
      cpmSize,
      cpmSize,
      { anchor: 'middle' },
    ),
  )

  // Hoist hook and its setting-out: to the right wall and to the front wall. As on
  // set 2 the across dimension runs behind the hook, the depth one left of it and the
  // note sits up and to the right; each flips side when the hook is too close to the
  // wall there, so nothing lands on a wall or the outer dimensions.
  // `d.hook` is measured from the left and FRONT walls; figure y runs from the back.
  const hook = { x: d.hook.x, y: BH - d.hook.y }
  const H = MACHINE_ROOM
  const behind = hook.y >= H.hookDimBack + H.hookDimRoom
  const leftSide = hook.x >= H.hookDimLeft + H.hookDimRoom
  out.push(
    ...placeSymbol(symbol('hook-plan'), {
      at: toSheet(v, hook),
      scale: v.scale,
    }),
    ...dim(
      v,
      hook,
      { x: AH, y: hook.y },
      {
        dir: 'h',
        offset: (behind ? -1 : 1) * H.hookDimBack * v.scale,
        style: st,
      },
    ),
    ...dim(
      v,
      hook,
      { x: hook.x, y: BH },
      {
        dir: 'v',
        offset: (leftSide ? -1 : 1) * H.hookDimLeft * v.scale,
        style: st,
      },
    ),
  )
  const noteSize = cadSize(v, CAD_TEXT.small)
  const noteW = measure(HOOK_LABEL, noteSize) / v.scale
  const right = hook.x + H.hookNote.x + noteW <= AH
  // Above the hook unless that runs into the back wall; then below it.
  const above = hook.y >= -H.hookNote.y + H.hookNoteRoom
  const start = toSheet(v, {
    x: right ? hook.x + H.hookNote.x : hook.x - H.hookNote.x - noteW,
    y: hook.y + (above ? H.hookNote.y : H.hookNoteBelow),
  })
  out.push(
    ...leader(
      toSheet(v, hook),
      { x: start.x, y: start.y - UNDERLINE_DROP * noteSize },
      [HOOK_LABEL],
      {
        size: noteSize,
        star: false,
        head: 'none',
        // From the far end, so the leader runs under the text down to the hook.
        attach: right ? 'end' : 'start',
      },
    ),
  )

  // Outer dimensions.
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
      { x: -W, y: front },
      { x: 0, y: front },
      {
        dir: 'h',
        offset: DIM_OFFSET.bottom * v.scale,
        style: st,
      },
    ),
    ...dim(
      v,
      { x: AH, y: front },
      { x: AH + W, y: front },
      {
        dir: 'h',
        offset: DIM_OFFSET.bottom * v.scale,
        style: st,
      },
    ),
    ...dimChain(
      v,
      [
        { x: AH + W, y: -W },
        { x: AH + W, y: 0 },
        { x: AH + W, y: BH },
        { x: AH + W, y: front },
      ],
      {
        dir: 'v',
        offset: DIM_OFFSET.depth * v.scale,
        style: st,
        labels: [undefined, prefixLabel('Chiều sâu = ')],
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
    ...dim(
      v,
      { x: -W, y: BH },
      { x: -W, y: front },
      {
        dir: 'v',
        offset: -DIM_OFFSET.side * v.scale,
        style: st,
      },
    ),
  )

  out.push(
    ...caption(v, AH / 2, front, CAPTION.machineRoom, MACHINE_ROOM_TITLE),
  )
  return out
}

/** DTP 08 body: the top room plan fitted into the framed sheet's drawing area. */
export function machineRoomSheet(p: ElevatorParams, d: Derived): Array<Prim> {
  return fitFigure((v) => drawMachineRoom(p, d, v)).prims
}
