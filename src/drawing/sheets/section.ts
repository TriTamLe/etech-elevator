import { landingOpening } from '#/domain/derive'
import type { Derived } from '#/domain/derive'
import type { ElevatorParams, JambType } from '#/domain/schema'
import {
  DIM_RATIO,
  breakLine,
  dim,
  dimChain,
  dimStyle,
  prefixLabel,
  sectionMark,
  shiftView,
  toSheet,
} from '#/drawing/primitives'
import type { DimLabel, DimStyle, View } from '#/drawing/primitives'
import {
  box,
  cadSize,
  cadText,
  callBoxHole,
  fitFigure,
  landingDoorFront,
  walls,
} from '#/drawing/sheets/figure'
import { UNDERLINE_DROP } from '#/drawing/prims'
import { SECTION } from '#/drawing/sheets/figure-layout'
import { placeSymbol, symbol } from '#/drawing/symbols'
import { measure } from '#/drawing/text-metrics'
import type { Prim, Pt } from '#/drawing/types'

// DTP 05 — Mặt cắt đứng hố thang: the hoistway cut lengthwise (side view, BH) and seen
// from the front (AH), sharing their levels. Floors are a diagram (one drawn height per
// floor or collapsed group, "THEO THỰC TẾ"); OH, the top room, PIT, openings and beams
// are drawn to the real numbers.

export const THEO_THUC_TE = 'THEO THỰC TẾ'

export type SectionLevel = {
  /** "TẦNG 2F~3F". */
  label: string
  /** Landing floor elevation (real mm above 1F). */
  floor: number
  /** Drawn height up to the next floor (OH for the top floor). */
  height: number
  isTop: boolean
  collapsed: boolean
  /** Jamb of the first floor in the level with a landing door; null = no door. */
  door: JambType | null
  /** Mid-beam tops above the floor (one every `midBeam.spacing`, below the next ring beam). */
  midBeams: Array<number>
}

export type SectionFrame = {
  levels: Array<SectionLevel>
  /** Top room floor ("TẦNG MÁI"), its ceiling (roof underside) and the roof slab's top. */
  machine: number
  roof: number
  roofTop: number
}

/** The section's levels from the floor groups, bottom to top. */
export function sectionLevels(p: ElevatorParams, d: Derived): SectionFrame {
  const ring = p.structure.ringBeamFloor.h
  const mid = p.structure.midBeam
  let e = 0
  const levels = d.floorGroups.map((g): SectionLevel => {
    const height = g.isTop ? p.tech.overhead : SECTION.slot
    const spacing = g.isTop ? mid.spacingTop : mid.spacing
    const midBeams: Array<number> = []
    // Up to the next ring beam's underside; bounded in case of a tiny spacing.
    for (
      let t = spacing;
      t < height - ring && midBeams.length < 20;
      t += spacing
    )
      if (t - mid.h > 0) midBeams.push(t)
    const door =
      g.indices.map((i) => p.floors[i]).find((f) => f.hasDoor)?.jamb ?? null
    const level = {
      label: `TẦNG ${g.label}`,
      floor: e,
      height,
      isTop: g.isTop,
      collapsed: g.collapsed,
      door,
      midBeams,
    }
    e += height
    return level
  })
  const machine = e
  const roof = machine + p.tech.topRoomHeight
  return { levels, machine, roof, roofTop: roof + SECTION.roof.thick }
}

export type SectionEquipment = {
  /** Side view: x from the door wall's inner face, y = −elevation. */
  side: {
    /** Insertion points (each symbol's own anchor); `sheave` is the sheave centre. */
    car: Pt
    pulley: Pt
    hitch: Pt
    bracket: Pt
    sheave: Pt
    counterweight: Pt
    /** Buffer F (car), buffer U (counterweight). */
    buffers: [Pt, Pt]
    hook: Pt
    /** Hitch → car pulley, car pulley → sheave, sheave → counterweight. */
    ropes: Array<[Pt, Pt]>
  }
  /** Front view: x from the left wall's inner face. */
  front: {
    /** CPM opening (top left corner, size), drawn to the form's w × h. */
    cpm: { x: number; y: number; w: number; h: number }
    hook: Pt
    buffers: [Pt, Pt]
  }
}

/**
 * Where the fixed-size equipment goes. The car side keeps M7's distances from the door
 * wall, the counterweight side from the back wall; the rope between them (car pulley
 * to sheave) runs straight, upright only when BH is M7's. The hook comes from the form.
 */
export function sectionEquipment(
  p: ElevatorParams,
  d: Derived,
  f: SectionFrame,
): SectionEquipment {
  const BH = p.tech.shaft.depth
  const AH = p.tech.shaft.width
  const pit = p.tech.pit
  const top = f.levels[f.levels.length - 1].floor
  const M = SECTION.machine
  const R = SECTION.ropes
  const sheave = { x: BH - M.fromBack, y: -(f.machine + M.sheave) }
  const counterweight = {
    x: BH - SECTION.counterweight.fromBack,
    y: pit - SECTION.counterweight.up,
  }
  const cwTop = counterweight.y + symbol('counterweight-side').bbox.y
  const cpmW = Math.min(p.topRoom.cpm.w, AH)
  const cpmH = Math.min(p.topRoom.cpm.h, p.tech.topRoomHeight)
  return {
    side: {
      car: { x: SECTION.car.x, y: -top + SECTION.car.below },
      pulley: { x: SECTION.pulley.x, y: -top + SECTION.pulley.below },
      hitch: { x: SECTION.hitch.x, y: -(f.machine + SECTION.hitch.top) },
      bracket: { x: SECTION.bracket.x, y: -(f.machine + SECTION.bracket.top) },
      sheave,
      counterweight,
      buffers: [
        { x: SECTION.buffers.car, y: pit },
        { x: BH - SECTION.buffers.counterweight, y: pit },
      ],
      hook: { x: d.hook.y, y: -f.roof },
      ropes: [
        [
          { x: SECTION.pulley.x, y: -(f.machine + R.hitchTop) },
          { x: SECTION.pulley.x, y: -top + R.hitchBottom },
        ],
        [
          { x: R.carX, y: -top + R.carBottom },
          { x: sheave.x - M.radius, y: sheave.y },
        ],
        [
          { x: sheave.x + M.radius, y: sheave.y },
          { x: sheave.x + M.radius, y: cwTop },
        ],
      ],
    },
    front: {
      cpm: { x: 0, y: -(f.machine + cpmH), w: cpmW, h: cpmH },
      hook: { x: d.hook.x, y: -f.roof },
      buffers: [
        { x: AH / 2, y: pit },
        { x: AH - SECTION.buffers.counterweight, y: pit },
      ],
    },
  }
}

type Span = [number, number]

/** `whole` less the `cut` spans (elevations), in order. */
function subtract(whole: Span, cut: ReadonlyArray<Span>): Array<Span> {
  const out: Array<Span> = []
  let lo = whole[0]
  for (const [a, b] of [...cut].sort((p, q) => p[0] - q[0])) {
    if (b <= lo) continue
    if (a >= whole[1]) break
    if (a > lo) out.push([lo, a])
    lo = Math.max(lo, b)
  }
  if (lo < whole[1]) out.push([lo, whole[1]])
  return out
}

const clip = (spans: ReadonlyArray<Span>, [lo, hi]: Span): Array<Span> =>
  spans
    .map(([a, b]): Span => [Math.max(a, lo), Math.min(b, hi)])
    .filter(([a, b]) => b > a)

/**
 * A wall cut in section between elevations `span`, `x`…`x + w`: concrete over the
 * `concrete` spans, open over `open`, brick elsewhere.
 */
function wallColumn(
  v: View,
  x: number,
  w: number,
  span: Span,
  concrete: ReadonlyArray<Span>,
  open: ReadonlyArray<Span> = [],
): Array<Prim> {
  const rect = ([a, b]: Span) => box(x, -b, w, b - a)
  const solid = subtract(span, open)
  const conc = solid.flatMap((s) => clip(concrete, s))
  const brick = solid.flatMap((s) => subtract(s, concrete))
  return [
    ...walls(v, conc.map(rect), 'AR-CONC', SECTION.hatch.concrete),
    ...walls(v, brick.map(rect), 'AR-B816C', SECTION.hatch.brick),
  ]
}

const outline = (v: View, pts: Array<Pt>, weight: 'thin' | 'medium'): Prim => ({
  kind: 'polyline',
  pts: pts.map((q) => toSheet(v, q)),
  closed: true,
  weight,
})

const segment = (v: View, a: Pt, b: Pt): Prim => ({
  kind: 'line',
  a: toSheet(v, a),
  b: toSheet(v, b),
  weight: 'thin',
})

const theo: DimLabel = () => THEO_THUC_TE

/** Ring beams under every floor and the top room floor, and the mid beams (elevations). */
function beamSpans(p: ElevatorParams, f: SectionFrame) {
  const ring = p.structure.ringBeamFloor.h
  const mid = p.structure.midBeam.h
  const floors = [...f.levels.map((l) => l.floor), f.machine]
  return {
    ring: floors.map((e): Span => [e - ring, e]),
    mid: f.levels.flatMap((l) =>
      l.midBeams.map((t): Span => [l.floor + t - mid, l.floor + t]),
    ),
    roof: [f.roofTop - p.structure.ringBeamTop.h, f.roofTop] as Span,
  }
}

/** Bands across the shaft where the side walls' ring and mid beams are seen. */
function beamBands(
  v: View,
  width: number,
  spans: ReadonlyArray<Span>,
): Array<Prim> {
  return spans.map(([a, b]) => outline(v, box(0, -b, width, b - a), 'thin'))
}

/** Side view (BH): door wall left with the landing slabs, back wall right. */
function sideView(p: ElevatorParams, f: SectionFrame, v: View): Array<Prim> {
  const W = p.structure.wall
  const BH = p.tech.shaft.depth
  const H = p.structure.roughOpeningHeight
  const head = p.structure.doorHeadBeam.h
  const pit = p.tech.pit
  const L = SECTION.landing
  const beams = beamSpans(p, f)
  const pitSpan: Span = [-pit - SECTION.pitSlab, 0]
  const doors = f.levels.filter((l) => l.door)
  const out: Array<Prim> = [
    // Door wall up to the top room floor: openings with their head beams.
    ...wallColumn(
      v,
      -W,
      W,
      [pitSpan[0], f.machine],
      [
        pitSpan,
        ...beams.ring,
        ...doors.map((l): Span => [l.floor + H, l.floor + H + head]),
      ],
      doors.map((l): Span => [l.floor, l.floor + H]),
    ),
    // Back wall up to the roof slab's top.
    ...wallColumn(
      v,
      BH,
      W,
      [pitSpan[0], f.roofTop],
      [pitSpan, ...beams.ring, ...beams.mid, beams.roof],
    ),
    ...beamBands(v, BH, [...beams.ring, ...beams.mid]),
    // Pit slab and roof slab.
    ...walls(
      v,
      [
        box(-W, pit, BH + 2 * W, SECTION.pitSlab),
        box(
          -W - SECTION.roof.reach,
          -f.roofTop,
          W + SECTION.roof.reach + BH,
          SECTION.roof.thick,
        ),
      ],
      'AR-CONC',
      SECTION.hatch.concrete,
    ),
  ]
  // Landing slabs in front of the door wall, bevelled under their tip; the top room
  // floor's reaches further.
  const slabs: Array<[number, { reach: number; bevel: number }]> = [
    ...f.levels.map((l): [number, typeof L] => [l.floor, L]),
    [f.machine, SECTION.topLanding],
  ]
  for (const [e, { reach, bevel }] of slabs)
    out.push(
      ...walls(
        v,
        [
          [
            { x: -W, y: -e },
            { x: -W - reach, y: -e },
            { x: -W - reach + bevel, y: -e + L.thick },
            { x: -W, y: -e + L.thick },
          ],
        ],
        'AR-CONC',
        SECTION.hatch.concrete,
      ),
    )
  // Landing doors (side view), at the door wall's inner face.
  const door = symbol('landing-door-side')
  for (const l of doors)
    out.push(
      ...placeSymbol(door, {
        at: toSheet(v, {
          x: SECTION.doorSide.x,
          y: -l.floor + SECTION.doorSide.down,
        }),
        scale: v.scale,
      }),
    )
  return out
}

/** Front view (AH): both side walls, the doors at every level with one. */
function frontView(p: ElevatorParams, f: SectionFrame, v: View): Array<Prim> {
  const W = p.structure.wall
  const AH = p.tech.shaft.width
  const pit = p.tech.pit
  const beams = beamSpans(p, f)
  const pitSpan: Span = [-pit - SECTION.pitSlab, 0]
  const out: Array<Prim> = []
  for (const x of [-W, AH])
    out.push(
      ...wallColumn(
        v,
        x,
        W,
        [pitSpan[0], f.roofTop],
        [pitSpan, ...beams.ring, ...beams.mid, beams.roof],
      ),
    )
  out.push(
    ...beamBands(v, AH, [...beams.ring, ...beams.mid]),
    ...walls(
      v,
      [
        box(-W, pit, AH + 2 * W, SECTION.pitSlab),
        box(0, -f.roofTop, AH, SECTION.roof.thick),
      ],
      'AR-CONC',
      SECTION.hatch.concrete,
    ),
  )
  for (const l of f.levels) {
    if (!l.door) continue
    const hole = callBoxHole(p, landingOpening(p, l.door).side)
    out.push(
      ...landingDoorFront(
        shiftView(v, 0, -l.floor),
        l.door,
        p.tech.door.width,
        p.tech.door.height,
        hole,
        AH / 2,
      ),
    )
  }
  return out
}

/** Side view's top room: the CPM edge-on and its label, the machine platform, the hook. */
function topRoomSide(
  p: ElevatorParams,
  f: SectionFrame,
  e: SectionEquipment,
  v: View,
): Array<Prim> {
  const W = p.structure.wall
  const BH = p.tech.shaft.depth
  const C = SECTION.cpm
  const out: Array<Prim> = [
    outline(v, box(-W, -f.roof, C.frame, f.roof - f.machine), 'thin'),
    ...C.lines.map((dx) =>
      segment(v, { x: -W + dx, y: -f.roof }, { x: -W + dx, y: -f.machine }),
    ),
    outline(
      v,
      box(
        -W / 2,
        -(f.machine + SECTION.platform),
        BH + W / 2,
        SECTION.platform,
      ),
      'medium',
    ),
    ...placeSymbol(symbol('hook-hang'), {
      at: toSheet(v, e.side.hook),
      scale: v.scale,
    }),
  ]
  // "CPM w X h" ending short of the frame, its underline running on to the frame.
  const label = `CPM ${p.topRoom.cpm.w} X ${p.topRoom.cpm.h}`
  const size = cadSize(v, SECTION.text.cpm)
  const end = toSheet(v, { x: -W - C.gap, y: -f.roof + C.below })
  const under = end.y + UNDERLINE_DROP * size
  out.push(
    { kind: 'text', x: end.x, y: end.y, text: label, size, anchor: 'end' },
    {
      kind: 'line',
      a: { x: end.x - measure(label, size), y: under },
      b: { x: toSheet(v, { x: -W, y: 0 }).x, y: under },
      weight: 'thin',
    },
  )
  return out
}

/** Side view's equipment: car and its pulley, rope hitch, machine, ropes, pit. */
function equipmentSide(e: SectionEquipment, v: View): Array<Prim> {
  const s = e.side
  const place = (
    id: Parameters<typeof symbol>[0],
    at: Pt,
    opts: { scale?: number; mirrorX?: boolean } = {},
  ) =>
    placeSymbol(symbol(id), {
      at: toSheet(v, at),
      scale: v.scale * (opts.scale ?? 1),
      mirrorX: opts.mirrorX,
    })
  return [
    ...place('car-side', s.car),
    ...place('car-pulley-side', s.pulley),
    ...place('rope-hitch-bracket', s.bracket),
    ...place('rope-hitch', s.hitch, { scale: SECTION.hitch.scale }),
    ...place(
      'machine',
      { x: s.sheave.x, y: s.sheave.y - SECTION.machine.centre },
      { mirrorX: true },
    ),
    ...s.ropes.map(([a, b]) => segment(v, a, b)),
    ...place('buffer-a', s.buffers[0]),
    ...place('buffer-b', s.buffers[1]),
    ...place('counterweight-side', s.counterweight),
  ]
}

/** Front view's top room and pit: the crossed CPM opening, the hook, the buffers. */
function equipmentFront(e: SectionEquipment, v: View): Array<Prim> {
  const c = e.front.cpm
  const r = box(c.x, c.y, c.w, c.h)
  return [
    outline(v, r, 'thin'),
    segment(v, r[0], r[2]),
    segment(v, r[1], r[3]),
    ...placeSymbol(symbol('hook-hang'), {
      at: toSheet(v, e.front.hook),
      scale: v.scale,
    }),
    ...placeSymbol(symbol('buffer-a'), {
      at: toSheet(v, e.front.buffers[0]),
      scale: v.scale,
    }),
    ...placeSymbol(symbol('buffer-b'), {
      at: toSheet(v, e.front.buffers[1]),
      scale: v.scale,
    }),
  ]
}

/** Side view: floor names on their level lines, opening heights, the level chain. */
function sideAnnotations(
  p: ElevatorParams,
  f: SectionFrame,
  v: View,
  st: DimStyle,
): Array<Prim> {
  const W = p.structure.wall
  const BH = p.tech.shaft.depth
  const D = SECTION.sideDims
  const tip = -W - SECTION.landing.reach
  const out: Array<Prim> = []
  const names: Array<[string, number]> = [
    ...f.levels.map((l): [string, number] => [l.label, l.floor]),
    [p.topRoom.name, f.machine],
  ]
  const size = cadSize(v, SECTION.text.level)
  for (const [name, e] of names) {
    const end = -W - D.total - SECTION.level.gap
    const start = end - measure(name, size) / v.scale
    out.push(
      ...cadText(v, end, -e - SECTION.level.top, name, SECTION.text.level, {
        anchor: 'end',
      }),
      {
        kind: 'line',
        a: toSheet(v, { x: start, y: -e }),
        b: toSheet(v, { x: tip, y: -e }),
        weight: 'thin',
      },
    )
  }
  for (const l of f.levels) {
    if (!l.door) continue
    for (const [h, off] of [
      [p.structure.roughOpeningHeight, D.opening],
      [p.tech.door.height, D.door],
    ] as const)
      out.push(
        ...dim(
          v,
          { x: -W, y: -l.floor },
          { x: -W, y: -l.floor - h },
          { dir: 'v', offset: -off * v.scale, style: st },
        ),
      )
  }
  const top = f.levels[f.levels.length - 1]
  out.push(
    ...dimChain(
      v,
      [p.tech.pit, ...f.levels.map((l) => -l.floor), -f.machine, -f.roof].map(
        (y) => ({ x: tip, y }),
      ),
      {
        dir: 'v',
        offset: -(D.chain - SECTION.landing.reach) * v.scale,
        style: st,
        labels: [
          prefixLabel('PIT = '),
          ...f.levels.map((l) => (l.isTop ? undefined : theo)),
        ],
      },
    ),
    ...dimChain(
      v,
      [-top.floor, -f.roof, -f.roofTop].map((y) => ({ x: tip, y })),
      {
        dir: 'v',
        offset: -(D.total - SECTION.landing.reach) * v.scale,
        style: st,
        labels: [prefixLabel('OH = ')],
      },
    ),
    ...dim(
      v,
      { x: 0, y: p.tech.pit + SECTION.pitSlab },
      { x: BH, y: p.tech.pit + SECTION.pitSlab },
      {
        dir: 'h',
        offset: SECTION.bottomDim * v.scale,
        style: st,
        label: () => 'BH',
      },
    ),
  )
  return out
}

/** Front view: level chain split at the mid beams, OH + top room, OH total, AH. */
function frontAnnotations(
  p: ElevatorParams,
  f: SectionFrame,
  v: View,
  st: DimStyle,
): Array<Prim> {
  const W = p.structure.wall
  const AH = p.tech.shaft.width
  const D = SECTION.frontDims
  const top = f.levels[f.levels.length - 1]
  const ys: Array<number> = [p.tech.pit, 0]
  const labels: Array<DimLabel | undefined> = [prefixLabel('PIT = ')]
  for (const l of f.levels) {
    for (const e of [
      ...l.midBeams.map((t) => l.floor + t),
      l.floor + l.height,
    ]) {
      ys.push(-e)
      labels.push(l.isTop ? undefined : theo)
    }
  }
  const at = (y: number) => ({ x: -W, y })
  return [
    ...dimChain(v, ys.map(at), {
      dir: 'v',
      offset: -D.chain * v.scale,
      style: st,
      labels,
    }),
    ...dimChain(v, [-top.floor, -f.machine, -f.roof].map(at), {
      dir: 'v',
      offset: -D.oh * v.scale,
      style: st,
    }),
    ...dimChain(v, [-top.floor, -f.roof, -f.roofTop].map(at), {
      dir: 'v',
      offset: -D.total * v.scale,
      style: st,
      labels: [prefixLabel('OH = ')],
    }),
    ...dim(
      v,
      { x: 0, y: p.tech.pit + SECTION.pitSlab },
      { x: AH, y: p.tech.pit + SECTION.pitSlab },
      {
        dir: 'h',
        offset: SECTION.bottomDim * v.scale,
        style: st,
        label: () => 'AH',
      },
    ),
  ]
}

function drawSection(p: ElevatorParams, d: Derived, v: View): Array<Prim> {
  const W = p.structure.wall
  const BH = p.tech.shaft.depth
  const AH = p.tech.shaft.width
  const f = sectionLevels(p, d)
  // Standard-40: its own arrow and gap rather than the per-em ratios of DIMTXT 100.
  const arrow = SECTION.dimArrow * v.scale
  const st = dimStyle(cadSize(v, SECTION.text.dim), {
    arrow,
    arrowWidth: arrow * DIM_RATIO.arrowWidth,
    gap: SECTION.dimGap * v.scale,
  })
  // Front view right of the side view; its x from its left wall's inner face.
  const fx = BH + W + SECTION.viewGap + W
  const fv = shiftView(v, fx, 0)
  const eq = sectionEquipment(p, d, f)
  const out: Array<Prim> = [
    ...sideView(p, f, v),
    ...topRoomSide(p, f, eq, v),
    ...equipmentSide(eq, v),
    ...frontView(p, f, fv),
    ...equipmentFront(eq, fv),
    ...sideAnnotations(p, f, v, st),
    ...frontAnnotations(p, f, fv, st),
  ]

  // Section marks: B through the top room, A through the top floor, C through the pit.
  const M = SECTION.marks
  const size = cadSize(v, SECTION.text.mark)
  const top = f.levels[f.levels.length - 1]
  const cuts: Array<[string, number]> = [
    ['B', f.machine + M.b],
    ['A', top.floor + M.a],
    ['C', -p.tech.pit * M.c],
  ]
  for (const [letter, e] of cuts)
    for (const x of [-W - M.left, fx + AH + W + M.right])
      out.push(
        ...sectionMark(toSheet(v, { x, y: -e }), letter, {
          size,
          length: M.length * v.scale,
        }),
      )

  // Break lines across a collapsed group, under the floor above it.
  for (const l of f.levels) {
    if (!l.collapsed) continue
    const y = -(l.floor + l.height) + SECTION.breakBelow
    const O = SECTION.breakOver
    out.push(
      ...breakLine(
        toSheet(v, { x: -W - O.side, y }),
        toSheet(v, { x: BH + W + O.side, y }),
      ),
      ...breakLine(
        toSheet(fv, { x: -W - O.front, y }),
        toSheet(fv, { x: AH + W + O.front, y }),
      ),
    )
  }
  return out
}

/** DTP 05 body: side and front views of the hoistway fitted into the drawing area. */
export function sectionSheet(p: ElevatorParams, d: Derived): Array<Prim> {
  return fitFigure((v) => drawSection(p, d, v)).prims
}
