import type { Box, Seg, SymbolData } from '#/drawing/symbols/types'
import type { Prim, Pt, Weight } from '#/drawing/types'

export type PlaceOpts = {
  /** Sheet position (mm) of the insertion point. */
  at: Pt
  /** Drawing scale as a factor: 1:25 → 1 / 25. */
  scale: number
  /** Quarter turns, clockwise on the sheet (y down). */
  rotate?: 0 | 90 | 180 | 270
  /** Mirror left-right about the insertion point (before rotating). */
  mirrorX?: boolean
  /**
   * Real-size stretch (mm, before scaling) along each axis's stretch line, in the
   * line's `dir` (a positive value always makes the symbol bigger).
   */
  stretch?: { x?: number; y?: number }
  weight?: Weight
}

type Xy = [number, number]

/** Move a point past the stretch lines (symbol mm). */
function stretcher(sym: SymbolData, by: PlaceOpts['stretch']) {
  const lines = sym.stretch
    .map((l) => ({ ...l, d: (l.axis === 'x' ? by?.x : by?.y) ?? 0 }))
    // A blank form field (NaN) must not turn the whole symbol into NaN.
    .filter((l) => Number.isFinite(l.d) && l.d !== 0)
  return ([x, y]: Xy): Xy => {
    for (const l of lines) {
      if (l.axis === 'x' && (x - l.at) * l.dir > 0) x += l.d * l.dir
      if (l.axis === 'y' && (y - l.at) * l.dir > 0) y += l.d * l.dir
    }
    return [x, y]
  }
}

/** Mirror, quarter-turn, scale and move a symbol point onto the sheet. */
function placer(o: PlaceOpts) {
  const turns = ((o.rotate ?? 0) / 90) % 4
  return ([x, y]: Xy): Xy => {
    if (o.mirrorX) x = -x
    for (let i = 0; i < turns; i++) [x, y] = [-y, x]
    return [o.at.x + x * o.scale, o.at.y + y * o.scale]
  }
}

/** Arc angles after the same mirror + rotation (sweep keeps increasing). */
function placeAngles(s: number, e: number, o: PlaceOpts): [number, number] {
  const sweep = e - s
  let start = o.mirrorX ? 180 - e : s
  start += o.rotate ?? 0
  start = ((start % 360) + 360) % 360
  return [start, start + sweep]
}

function placeSeg(
  seg: Seg,
  stretch: (p: Xy) => Xy,
  place: (p: Xy) => Xy,
  o: PlaceOpts,
): Prim {
  const weight = o.weight ?? 'thin'
  if (seg.t === 'l') {
    const pts = []
    for (let i = 0; i < seg.p.length; i += 2) {
      const [x, y] = place(stretch([seg.p[i], seg.p[i + 1]]))
      pts.push({ x, y })
    }
    return { kind: 'polyline', pts, closed: seg.z, weight }
  }
  // Arcs and circles move rigidly. A circle goes with its centre; an arc goes with the
  // stroke itself (its mid point), since its centre can sit on the other side of the
  // stretch line (gen:symbols rejects arcs that straddle one).
  let [ox, oy] = [seg.c[0], seg.c[1]]
  if (seg.t === 'a') {
    const mid = (((seg.s + seg.e) / 2) * Math.PI) / 180
    const px = ox + seg.r * Math.cos(mid)
    const py = oy + seg.r * Math.sin(mid)
    const [qx, qy] = stretch([px, py])
    ;[ox, oy] = [ox + qx - px, oy + qy - py]
  } else {
    ;[ox, oy] = stretch([ox, oy])
  }
  const [cx, cy] = place([ox, oy])
  const r = seg.r * o.scale
  if (seg.t === 'c') return { kind: 'circle', c: { x: cx, y: cy }, r, weight }
  const [start, end] = placeAngles(seg.s, seg.e, o)
  return { kind: 'arc', c: { x: cx, y: cy }, r, start, end, weight }
}

/** A symbol as sheet primitives: stretch (real mm), then mirror, rotate, scale, move. */
export function placeSymbol(sym: SymbolData, o: PlaceOpts): Array<Prim> {
  const stretch = stretcher(sym, o.stretch)
  const place = placer(o)
  return sym.segs.map((seg) => placeSeg(seg, stretch, place, o))
}

/** Real-size bounds (mm, relative to the insertion point) after stretching. */
export function stretchedBox(
  sym: SymbolData,
  by: PlaceOpts['stretch'] = {},
): Box {
  let { x, y, w, h } = sym.bbox
  for (const l of sym.stretch) {
    const d = (l.axis === 'x' ? by.x : by.y) ?? 0
    if (!Number.isFinite(d) || d === 0) continue
    const [lo, size] = l.axis === 'x' ? [x, w] : [y, h]
    // The moving side holds part of the box: it grows (towards `dir`).
    const grows = l.dir > 0 ? l.at < lo + size : l.at > lo
    if (!grows) continue
    // The whole box is on the moving side: it only shifts.
    const shifts = l.dir > 0 ? l.at < lo : l.at > lo + size
    const nlo = l.dir < 0 ? lo - d : shifts ? lo + d : lo
    const nsize = shifts ? size : size + d
    if (l.axis === 'x') [x, w] = [nlo, nsize]
    else [y, h] = [nlo, nsize]
  }
  return { x, y, w, h }
}

/** Sheet bounds of a placed symbol (same transform as placeSymbol). */
export function placedBox(sym: SymbolData, o: PlaceOpts): Box {
  const b = stretchedBox(sym, o.stretch)
  const place = placer(o)
  const corners = [
    place([b.x, b.y]),
    place([b.x + b.w, b.y]),
    place([b.x, b.y + b.h]),
    place([b.x + b.w, b.y + b.h]),
  ]
  const xs = corners.map((c) => c[0])
  const ys = corners.map((c) => c[1])
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}
