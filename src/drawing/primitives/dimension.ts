import { hline, text, vline } from '#/drawing/prims'
import { arrowHead } from '#/drawing/primitives/arrow-head'
import { toSheet } from '#/drawing/primitives/view'
import type { View } from '#/drawing/primitives/view'
import { measure } from '#/drawing/text-metrics'
import type { LinePrim, Prim, Pt, Weight } from '#/drawing/types'

// Linear dimensions as on the reference set: text above the line (left of it, reading
// bottom to top, on vertical ones), closed filled arrows, extension lines running a bit
// past the dimension line. The value always comes from the real coordinates.

/** Dimension geometry in sheet mm, all derived from the text size. */
export type DimStyle = {
  /** Font size (em, sheet mm). */
  text: number
  arrow: number
  /** Arrowhead base width. */
  arrowWidth: number
  /** Text baseline above the dimension line. */
  gap: number
  /** Gap between the measured point and its extension line. */
  extOffset: number
  /** Extension line past the dimension line. */
  extBeyond: number
  head: 'arrow' | 'tick'
  weight: Weight
}

/**
 * Parts of a dimension per em of its text. From the DWG (every sheet's dimensions use
 * DIMTXT 100, DIMASZ 40, DIMGAP 20, DIMEXE 35, with a 100-unit TrueType height setting
 * an em of ~118) and checked on the plan sheet of the reference PDF at 400 dpi.
 */
export const DIM_RATIO = {
  arrow: 0.34,
  /** Of the arrow length: AutoCAD's closed filled arrow is a third as wide as long. */
  arrowWidth: 1 / 3,
  gap: 0.17,
  /** DIMEXO is unset in those styles (AutoCAD default ≈ 0); the walls meet the lines. */
  extOffset: 0,
  extBeyond: 0.3,
} as const

export function dimStyle(
  textSize: number,
  overrides: Partial<DimStyle> = {},
): DimStyle {
  const arrow = DIM_RATIO.arrow * textSize
  return {
    text: textSize,
    arrow,
    arrowWidth: arrow * DIM_RATIO.arrowWidth,
    gap: DIM_RATIO.gap * textSize,
    extOffset: DIM_RATIO.extOffset * textSize,
    extBeyond: DIM_RATIO.extBeyond * textSize,
    head: 'arrow',
    weight: 'thin',
    ...overrides,
  }
}

export type DimLabel = (value: number) => string

/** Default label: the rounded real length, no thousands separator ("1500"). */
export const plainLabel: DimLabel = (v) => String(Math.round(v))

/** "Chiều rộng = 1500" style label. */
export const prefixLabel =
  (prefix: string): DimLabel =>
  (v) =>
    `${prefix}${Math.round(v)}`

export type DimOpts = {
  /** 'h' measures along x, 'v' along y. */
  dir: 'h' | 'v'
  /**
   * Sheet mm from the measured points to the dimension line, counted from the outermost
   * point on that side: negative is above ('h') / left ('v'), positive below / right.
   */
  offset: number
  style: DimStyle
  label?: DimLabel
  /**
   * Which extension lines to draw (skip one that would sit on a drawn wall). In a chain,
   * 'a' drops the last point's line and 'b' the first's.
   */
  ext?: 'both' | 'a' | 'b' | 'none'
  /** Move the text along the line (sheet mm) where it would collide. */
  textShift?: number
}

export type ChainOpts = Omit<DimOpts, 'label' | 'textShift'> & {
  /** Label per segment; a missing entry uses the plain value. */
  labels?: ReadonlyArray<DimLabel | undefined>
  textShifts?: ReadonlyArray<number | undefined>
}

const finite = (p: Pt) => Number.isFinite(p.x) && Number.isFinite(p.y)

/** Sheet coordinate of the dimension line for points `ps` (sheet). */
function lineAt(ps: ReadonlyArray<Pt>, dir: 'h' | 'v', offset: number) {
  const across = ps.map((p) => (dir === 'h' ? p.y : p.x))
  const edge = offset < 0 ? Math.min(...across) : Math.max(...across)
  return edge + offset
}

/** Extension line from a measured point (sheet) to just past the dimension line. */
function extLine(p: Pt, dir: 'h' | 'v', line: number, s: DimStyle): LinePrim {
  const from = dir === 'h' ? p.y : p.x
  const sign = line >= from ? 1 : -1
  const a = from + sign * s.extOffset
  const b = line + sign * s.extBeyond
  return dir === 'h' ? vline(p.x, a, b, s.weight) : hline(p.y, a, b, s.weight)
}

/** Arrow or tick at `at` on the line; `out` is the unit direction the tip points to. */
function head(at: Pt, out: Pt, s: DimStyle): Prim {
  if (s.head === 'arrow') return arrowHead(at, out, s.arrow, s.arrowWidth)
  // Architectural tick: "/" across a horizontal line (45° to it), as long as an arrow,
  // drawn heavier.
  const h = s.arrow / 2
  const tx = (out.x + out.y) * Math.SQRT1_2
  const ty = (out.y - out.x) * Math.SQRT1_2
  return {
    kind: 'line',
    a: { x: at.x - tx * h, y: at.y - ty * h },
    b: { x: at.x + tx * h, y: at.y + ty * h },
    weight: 'medium',
  }
}

type Seg = {
  /** Sheet positions of both ends along the line (lo < hi). */
  lo: number
  hi: number
  value: number
  label: DimLabel
  textShift: number
  /**
   * Free end of a chain's first or last segment (sheet position along the line), where
   * text too wide for the segment moves to; null for inner segments and single dims.
   */
  freeEnd: number | null
}

/** Dimension line, arrows and text of one segment on a line at `line`. */
function segment(seg: Seg, dir: 'h' | 'v', line: number, s: DimStyle) {
  const out: Array<Prim> = []
  const at = (u: number): Pt =>
    dir === 'h' ? { x: u, y: line } : { x: line, y: u }
  const unit: Pt = dir === 'h' ? { x: 1, y: 0 } : { x: 0, y: 1 }
  const neg: Pt = { x: -unit.x, y: -unit.y }
  const label = seg.label(seg.value)
  const tw = measure(label, s.text)
  const span = seg.hi - seg.lo
  // Arrows go outside first when text and both arrows do not fit (DIMATFIT 1); ticks
  // never need the room.
  const inside = s.head === 'tick' || span >= tw + 2 * s.arrow
  const tail = inside ? (s.head === 'tick' ? s.arrow : 0) : 2 * s.arrow
  const line0 = seg.lo - tail
  const line1 = seg.hi + tail
  out.push(
    dir === 'h'
      ? hline(line, line0, line1, s.weight)
      : vline(line, line0, line1, s.weight),
  )
  if (s.head === 'tick' || inside) {
    out.push(head(at(seg.lo), neg, s), head(at(seg.hi), unit, s))
  } else {
    out.push(head(at(seg.lo), unit, s), head(at(seg.hi), neg, s))
  }

  // Text centred over the segment; in a chain, an end segment too short for its text
  // pushes it outward past its free end.
  let mid = (seg.lo + seg.hi) / 2 + seg.textShift
  if (seg.textShift === 0 && tw > span && seg.freeEnd !== null) {
    const away = tw / 2 + s.arrow * 2 + s.gap
    mid = seg.freeEnd === seg.lo ? seg.lo - away : seg.hi + away
  }
  out.push(
    dir === 'h'
      ? text(mid, line - s.gap, label, s.text, { anchor: 'middle' })
      : text(line - s.gap, mid, label, s.text, {
          anchor: 'middle',
          rotate: -90,
        }),
  )
  return out
}

/**
 * Chain of dimensions on one line through real points `pts` (in order along the axis),
 * e.g. "300 | LỖ CHỜ = 900 | 300". A point that is not finite (blank field) drops the
 * whole chain rather than drawing a wrong number.
 */
export function dimChain(
  v: View,
  pts: ReadonlyArray<Pt>,
  o: ChainOpts,
): Array<Prim> {
  if (pts.length < 2 || !pts.every(finite)) return []
  const sp = pts.map((p) => toSheet(v, p))
  const line = lineAt(sp, o.dir, o.offset)
  const along = (p: Pt) => (o.dir === 'h' ? p.x : p.y)
  const out: Array<Prim> = []
  const ext = o.ext ?? 'both'
  sp.forEach((p, i) => {
    const want =
      ext === 'both' ||
      (ext === 'a' && i < sp.length - 1) ||
      (ext === 'b' && i > 0)
    if (want) out.push(extLine(p, o.dir, line, o.style))
  })
  for (let i = 0; i + 1 < pts.length; i++) {
    const [a, b] = [along(sp[i]), along(sp[i + 1])]
    const real = Math.abs(along(pts[i + 1]) - along(pts[i]))
    out.push(
      ...segment(
        {
          lo: Math.min(a, b),
          hi: Math.max(a, b),
          value: real,
          label: o.labels?.[i] ?? plainLabel,
          textShift: o.textShifts?.[i] ?? 0,
          // The chain may run either way on the sheet (a section passes y = −level).
          freeEnd:
            pts.length < 3
              ? null
              : i === 0
                ? along(sp[0])
                : i === pts.length - 2
                  ? along(sp[sp.length - 1])
                  : null,
        },
        o.dir,
        line,
        o.style,
      ),
    )
  }
  return out
}

/** One linear dimension between real points `a` and `b`. */
export function dim(v: View, a: Pt, b: Pt, o: DimOpts): Array<Prim> {
  return dimChain(v, [a, b], {
    ...o,
    labels: [o.label],
    textShifts: [o.textShift],
  })
}
