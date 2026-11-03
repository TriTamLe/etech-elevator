import type { Derived } from '#/domain/derive'
import type { ElevatorParams } from '#/domain/schema'
import { UNDERLINE_DROP } from '#/drawing/prims'
import {
  dim,
  leader,
  noteExtent,
  stackNotes,
  table,
  toSheet,
} from '#/drawing/primitives'
import type { DimStyle, TableRow, View } from '#/drawing/primitives'
import { cadSize } from '#/drawing/sheets/figure'
import { MIN_TEXT_SHARE, SECTION } from '#/drawing/sheets/figure-layout'
import type {
  SectionEquipment,
  SectionFrame,
  SectionLevel,
} from '#/drawing/sheets/section'
import { midSpan, ringSpan, roofSpan } from '#/drawing/sheets/section-beams'
import type { Span } from '#/drawing/sheets/section-beams'
import { placeSymbol, symbol } from '#/drawing/symbols'
import { measure } from '#/drawing/text-metrics'
import type { Prim, Pt } from '#/drawing/types'
import { formatDecimal } from '#/lib/format'

// DTP 05's notes: the "*…" leader notes on the side view (beams and mid beams in one
// column right of it, door head beams left of it, the hook above the roof), the hoist
// hook detail and the floor height table right of the front view. Wording and beam
// sizes come from the form.

export const MACHINE_BEAMS_NOTE = 'Vị trí đặt máy'
export const HOOK_DETAIL_NOTE = [
  'Móc treo Palăng',
  'Khách hàng thực hiện',
] as const
export const HEIGHT_TABLE_HEADER = 'Chiều cao các tầng'
/** Printed for a floor height not entered yet. */
export const NO_HEIGHT = '.......'

/** "Sàn đặt máy 200x200": the machine platform drawn under the machine. */
export const machineFloorNote = () =>
  `Sàn đặt máy ${SECTION.platform}x${SECTION.platform}`

export const hookNote = (p: ElevatorParams) =>
  `Móc treo tải ${formatDecimal(p.topRoom.hook.loadTon)} tấn`

type ColumnNote = {
  lines: Array<string>
  /** Beam (elevations) the note points at. */
  beam: Span
}

/** The notes right of the side view, top to bottom of the building. */
export function sideColumnNotes(
  p: ElevatorParams,
  f: SectionFrame,
): Array<ColumnNote> {
  const top = p.structure.ringBeamTop
  const ring = p.structure.ringBeamFloor
  const mid = p.structure.midBeam
  const out: Array<ColumnNote> = [
    {
      lines: ['Dầm bê tông', `${top.w}x${top.h}`, 'kiềng quanh hố', 'thang'],
      beam: roofSpan(p, f),
    },
    {
      lines: [
        p.topRoom.machineSupport === 'beams'
          ? MACHINE_BEAMS_NOTE
          : machineFloorNote(),
        `*Dầm bê tông ${ring.w} x ${ring.h}`,
        'kiềng quanh hố thang',
      ],
      beam: ringSpan(p, f.machine),
    },
  ]
  for (const l of [...f.levels].reverse()) {
    if (l.midBeams.length)
      out.push({
        lines: [
          `Đà bê tông giữa tầng ${mid.w}x${mid.h}`,
          'hai mặt hông và sau hố thang',
          `khoảng cách giữa 2 đà = ${l.isTop ? mid.spacingTop : mid.spacing}`,
        ],
        beam: midSpan(p, l, Math.min(...l.midBeams)),
      })
    if (l.floor > 0)
      out.push({
        lines: [
          'Dầm bê tông',
          `${ring.w} x ${ring.h}`,
          'kiềng quanh',
          'hố thang',
        ],
        beam: ringSpan(p, l.floor),
      })
  }
  return out
}

type Placed = {
  lines: Array<string>
  /** Underline (sheet y) and the note's reach above / below it (sheet mm). */
  shelf: number
  above: number
  below: number
}

/** A placed note's elevation range [bottom, top] (real mm). */
const elevations = (v: View, n: Placed): Span => [
  -(n.shelf + n.below - v.origin.y) / v.scale,
  -(n.shelf - n.above - v.origin.y) / v.scale,
]

const middle = ([a, b]: Span) => (a + b) / 2

/** The beam column: underlines wanted `rise` above each beam's top, pushed down where they meet. */
function columnLayout(
  p: ElevatorParams,
  f: SectionFrame,
  v: View,
): Array<Placed & { beam: Span }> {
  const N = SECTION.notes
  const size = cadSize(v, SECTION.text.note)
  const notes = sideColumnNotes(p, f).map((n) => ({
    ...n,
    shelf: toSheet(v, { x: 0, y: -(n.beam[1] + N.rise) }).y,
    ...noteExtent(n.lines.length, size),
  }))
  const ys = stackNotes(
    notes.map((n) => ({ y: n.shelf, above: n.above, below: n.below })),
    N.gap * v.scale,
  )
  return notes.map((n, i) => ({ ...n, shelf: ys[i] }))
}

/** "*Dầm đầu cửa" notes, one per level with a door, ending short of the door wall. */
function doorLayout(
  p: ElevatorParams,
  f: SectionFrame,
  v: View,
): Array<Placed & { at: Pt; target: Pt }> {
  const W = p.structure.wall
  const H = p.structure.roughOpeningHeight
  const head = p.structure.doorHeadBeam
  const D = SECTION.doorNote
  const size = cadSize(v, SECTION.text.note)
  const lines = ['Dầm đầu cửa', `${head.w}x${head.h}`]
  const w = measure(`*${lines[0]}`, size)
  return f.levels
    .filter((l) => l.door)
    .map((l) => {
      const end = toSheet(v, {
        x: -W - D.end,
        y: -(l.floor + H + head.h + D.above),
      })
      return {
        lines,
        shelf: end.y,
        ...noteExtent(lines.length, size),
        at: { x: end.x - w, y: end.y - UNDERLINE_DROP * size },
        target: toSheet(v, { x: -W, y: -(l.floor + H + head.h / 2) }),
      }
    })
}

/**
 * Where the break line across collapsed level `l` goes (elevation): `breakClear` under
 * the note on the floor above it, or halfway to the nearest note below when closer.
 */
export function breakElevation(
  p: ElevatorParams,
  f: SectionFrame,
  l: SectionLevel,
  v: View,
): number {
  const F = l.floor + l.height
  const column = columnLayout(p, f, v)
  const notes = [...column, ...doorLayout(p, f, v)].map((n) => elevations(v, n))
  const ring = column.find((n) => n.beam[1] === F)
  const upper = ring ? elevations(v, ring)[0] : F
  const lower = Math.max(
    -Infinity,
    ...notes.map(([, t]) => t).filter((t) => t < upper),
  )
  return upper - Math.min(SECTION.breakClear, (upper - lower) / 2)
}

/** Side view notes: the beam column (stacked), the door head beams, the hook. */
export function sideNotes(
  p: ElevatorParams,
  f: SectionFrame,
  e: SectionEquipment,
  v: View,
): Array<Prim> {
  const W = p.structure.wall
  const BH = p.tech.shaft.depth
  const N = SECTION.notes
  const size = cadSize(v, SECTION.text.note)
  const drop = UNDERLINE_DROP * size
  const x = toSheet(v, { x: BH + W + N.x, y: 0 }).x
  const out: Array<Prim> = []
  const column = columnLayout(p, f, v)
  for (const n of column) {
    const y = -middle(n.beam)
    // Later lines centre under the first: a wider one must not reach back over the wall.
    const first = measure(`*${n.lines[0]}`, size)
    const widest = Math.max(
      first,
      ...n.lines.slice(1).map((l) => measure(l, size)),
    )
    out.push(
      ...leader(
        [toSheet(v, { x: BH + W / 2, y }), toSheet(v, { x: BH - N.band, y })],
        { x: x + (widest - first) / 2, y: n.shelf - drop },
        n.lines,
        { size },
      ),
    )
  }
  for (const n of doorLayout(p, f, v))
    out.push(...leader(n.target, n.at, n.lines, { size }))
  // The hook note keeps clear of the roof's ring beam note.
  const roofNote = elevations(v, column[0])[1]
  const below = noteExtent(1, size).below / v.scale
  out.push(...hookLeader(p, f, e.side.hook, v, roofNote + N.gap + below))
  return out
}

/** Front view notes: the hook. */
export function frontNotes(
  p: ElevatorParams,
  f: SectionFrame,
  e: SectionEquipment,
  v: View,
): Array<Prim> {
  return hookLeader(p, f, e.front.hook, v)
}

/**
 * "*Móc treo tải 2 tấn" above the roof (its underline at least at elevation `lowest`),
 * left of the hook unless it would run more than `overhang` past the left wall's outer
 * face, then right of it; its leader drops into the hook.
 */
function hookLeader(
  p: ElevatorParams,
  f: SectionFrame,
  hook: Pt,
  v: View,
  lowest = -Infinity,
): Array<Prim> {
  const K = SECTION.hookNote
  const size = cadSize(v, SECTION.text.note)
  const w = measure(`*${hookNote(p)}`, size) / v.scale
  const left = hook.x - K.gap - w >= -p.structure.wall - K.overhang
  const at = toSheet(v, {
    x: left ? hook.x - K.gap - w : hook.x + K.gap,
    y: -Math.max(f.roofTop + K.above, lowest),
  })
  return leader(
    toSheet(v, { x: hook.x + K.target.x, y: hook.y + K.target.down }),
    { x: at.x, y: at.y - UNDERLINE_DROP * size },
    [hookNote(p)],
    { size, attach: left ? 'end' : 'start' },
  )
}

/**
 * Hoist hook detail right of the front view: the fixed `hook-detail` shape with the
 * form's a, a, b printed on its dimensions (the one exception to dimensions reading
 * the drawn length), its two notes and "Sắt Ø{bar}".
 */
export function hookDetail(
  p: ElevatorParams,
  f: SectionFrame,
  v: View,
  st: DimStyle,
): Array<Prim> {
  const D = SECTION.detail
  const { bar, a, b } = p.topRoom.hoistDetail
  const top = f.top.floor
  const o = {
    x: p.tech.shaft.width + p.structure.wall + D.x,
    y: -(top - D.down),
  }
  // Detail coordinates are y up from the origin.
  const at = (x: number, y: number): Pt => ({ x: o.x + x, y: o.y - y })
  const fixed = (n: number) => () => String(n)
  const size = cadSize(v, SECTION.text.detail)
  const barSize = cadSize(v, SECTION.text.bar)
  const shelf = (x: number, y: number, s: number) => {
    const q = toSheet(v, at(x, y))
    return { x: q.x, y: q.y - UNDERLINE_DROP * s }
  }
  return [
    ...placeSymbol(symbol('hook-detail'), {
      at: toSheet(v, o),
      scale: v.scale,
    }),
    ...dimTo(
      v,
      at(D.across.x0, D.across.y),
      at(D.across.x1, D.across.y),
      'h',
      o.y - D.across.line,
      st,
      fixed(a),
    ),
    ...dimTo(
      v,
      at(D.depth.x, D.depth.y0),
      at(D.depth.x, D.depth.y1),
      'v',
      o.x + D.depth.line,
      st,
      fixed(a),
    ),
    ...dimTo(
      v,
      at(D.length.a.x, D.length.a.y),
      at(D.length.b.x, D.length.b.y),
      'h',
      o.y - D.length.line,
      st,
      fixed(b),
    ),
    ...leader(
      toSheet(v, at(D.note.target.x, D.note.target.y)),
      shelf(D.note.x, D.note.shelf, size),
      [
        `${HOOK_DETAIL_NOTE[0]} ${formatDecimal(p.topRoom.hook.loadTon)} tấn`,
        HOOK_DETAIL_NOTE[1],
      ],
      { size, star: false },
    ),
    ...leader(
      toSheet(v, at(D.bar.target.x, D.bar.target.y)),
      shelf(D.bar.x, D.bar.shelf, barSize),
      [`Sắt Ø${bar}`],
      { size: barSize, star: false },
    ),
  ]
}

/** `dim` with its line at the figure coordinate `line` (y for 'h', x for 'v'). */
function dimTo(
  v: View,
  a: Pt,
  b: Pt,
  dir: 'h' | 'v',
  line: number,
  style: DimStyle,
  label: () => string,
): Array<Prim> {
  const A = toSheet(v, a)
  const B = toSheet(v, b)
  const L =
    dir === 'h'
      ? toSheet(v, { x: 0, y: line }).y
      : toSheet(v, { x: line, y: 0 }).x
  const across = dir === 'h' ? [A.y, B.y] : [A.x, B.x]
  const [lo, hi] = [Math.min(...across), Math.max(...across)]
  // `dim` counts its offset from the outermost point on the line's side.
  if (L > lo && L < hi)
    throw new Error('dimTo: the dimension line must lie outside its points')
  return dim(v, a, b, { dir, offset: L - (L >= hi ? hi : lo), style, label })
}

/**
 * The floor height table right of the front view, below the hook detail: "Chiều cao
 * các tầng" over the rows of `heightTableRows`; OH reads "4800 (3600 + 1200)".
 */
export function heightTable(
  p: ElevatorParams,
  d: Derived,
  f: SectionFrame,
  v: View,
): Array<Prim> {
  const T = SECTION.table
  const top = f.top.floor
  const at = toSheet(v, {
    x: p.tech.shaft.width + p.structure.wall + T.x,
    y: -(top - T.down),
  })
  const values = d.heightRows.map((r): [string, string] =>
    r.parts
      ? [`${r.label} (OH)`, `${r.value} (${r.parts[0]} + ${r.parts[1]})`]
      : [r.label, r.value === null ? NO_HEIGHT : String(r.value)],
  )
  // Rows end above the figure's bottom (the BH / AH line) when they can.
  const bottom = toSheet(v, {
    x: 0,
    y: p.tech.pit + SECTION.pitSlab + SECTION.bottomDim,
  }).y
  const space = (bottom - at.y) / v.scale - T.header
  const row =
    Math.min(T.row, Math.max(T.minRow, space / Math.max(1, values.length))) *
    v.scale
  const size = cadSize(v, SECTION.text.table)
  const rows: Array<TableRow> = [
    { h: T.header * v.scale, cells: [{ text: HEIGHT_TABLE_HEADER, span: 2 }] },
    ...values.map(([l, value]) => ({
      h: row,
      cells: [{ text: l }, { text: value }],
    })),
  ]
  return table({
    x: at.x,
    y: at.y,
    cols: T.cols.map((c) => c * v.scale),
    rows,
    size,
    minSize: size * MIN_TEXT_SHARE,
  })
}
