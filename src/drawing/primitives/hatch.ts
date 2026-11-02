import { HATCH_PATTERNS } from '#/drawing/primitives/hatch-patterns'
import type {
  HatchName,
  PatternLine,
} from '#/drawing/primitives/hatch-patterns'
import { toSheet } from '#/drawing/primitives/view'
import type { View } from '#/drawing/primitives/view'
import type { Prim, Pt, Weight } from '#/drawing/types'

// Hatching as real strokes, clipped to the region here rather than by an SVG clipPath:
// the PDF holds only what shows, svg2pdf has nothing to get wrong, and tests can check
// every stroke lies inside. Lines follow AutoCAD's rules exactly (pattern origin at the
// real-world origin, so neighbouring regions line up), which keeps the output stable.

/**
 * Above this many strokes in one region the pattern scale doubles (and again if
 * needed): denser hatching would print as grey noise and bloat the PDF. This is per
 * region, so a huge region can come out coarser than a small neighbour with the same
 * pattern; split huge regions (or pick a larger pattern scale) where that shows.
 */
export const MAX_HATCH_SEGS = 20000

/**
 * Closest spacing (sheet mm) allowed between a pattern's parallel solid lines; below it
 * the pattern scale doubles until it is met, so a small drawing scale never turns a
 * hatch into a black patch.
 */
export const MIN_HATCH_GAP = 0.3

export type HatchOpts = {
  /** Pattern scale as in AutoCAD (real mm per pattern unit), e.g. 20 for AR-BRSTD. */
  scale: number
  /** Extra rotation of the whole pattern, degrees counter-clockwise on paper. */
  angle?: number
  /** Real-world pattern origin; default (0, 0) like AutoCAD. */
  origin?: Pt
  /** Stroke; defaults to the pattern's own. */
  weight?: Weight
  /** Also draw each ring as a closed outline at this weight. */
  outline?: Weight
}

type Xy = [number, number]

/**
 * Closest spacing (pattern units) between parallel solid lines of a pattern: each solid
 * family's own pitch and the offsets between solid families at the same angle (ANSI34's
 * four close lines). Dashed families are left out: their short dashes (BRSTONE's
 * texture, concrete's specks) never merge into a patch. Infinity when nothing is solid.
 */
function solidGap(lines: ReadonlyArray<PatternLine>): number {
  const solid = lines.filter((l) => !l.dashes.length && l.delta[1] !== 0)
  let gap = Infinity
  for (const a of solid) {
    const pitch = Math.abs(a.delta[1])
    gap = Math.min(gap, pitch)
    const th = (a.angle * Math.PI) / 180
    const n: Xy = [-Math.sin(th), Math.cos(th)]
    for (const b of solid) {
      if (a === b || (a.angle - b.angle) % 180 !== 0) continue
      if (Math.abs(b.delta[1]) !== pitch) continue
      const across =
        n[0] * (b.origin[0] - a.origin[0]) + n[1] * (b.origin[1] - a.origin[1])
      const r = ((across % pitch) + pitch) % pitch
      const d = Math.min(r, pitch - r)
      if (d > 1e-9) gap = Math.min(gap, d)
    }
  }
  return gap
}

/** Intervals (along u from `base`) where the line base + t·u is inside the rings. */
function insideIntervals(
  rings: ReadonlyArray<ReadonlyArray<Xy>>,
  base: Xy,
  u: Xy,
  n: Xy,
): Array<number> {
  const c = n[0] * base[0] + n[1] * base[1]
  const ub = u[0] * base[0] + u[1] * base[1]
  const ts: Array<number> = []
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i++) {
      const p = ring[i]
      const q = ring[(i + 1) % ring.length]
      const sp = n[0] * p[0] + n[1] * p[1] - c
      const sq = n[0] * q[0] + n[1] * q[1] - c
      // Half-open test: a line through a vertex counts it once (or twice, or never).
      if (sp > 0 === sq > 0) continue
      const k = sp / (sp - sq)
      const x = p[0] + (q[0] - p[0]) * k
      const y = p[1] + (q[1] - p[1]) * k
      ts.push(u[0] * x + u[1] * y - ub)
    }
  }
  return ts.sort((a, b) => a - b)
}

/** Strokes of one pattern line family inside the rings, appended to `out`. */
function family(
  line: PatternLine,
  rings: ReadonlyArray<ReadonlyArray<Xy>>,
  k: number,
  rot: number,
  origin: Xy,
  out: Array<number>,
  limit: number,
): boolean {
  const th = ((line.angle + rot) * Math.PI) / 180
  const u: Xy = [Math.cos(th), Math.sin(th)]
  const n: Xy = [-u[1], u[0]]
  // The line origins turn with the whole pattern, not with each line's own angle.
  const r = (rot * Math.PI) / 180
  const [lx, ly] = [line.origin[0] * k, line.origin[1] * k]
  const base: Xy = [
    origin[0] + lx * Math.cos(r) - ly * Math.sin(r),
    origin[1] + lx * Math.sin(r) + ly * Math.cos(r),
  ]
  const dx = line.delta[0] * k
  const dy = line.delta[1] * k
  if (Math.abs(dy) < 1e-12) return true
  // Lines j = jmin…jmax cover the region's extent across the lines.
  let cmin = Infinity
  let cmax = -Infinity
  for (const ring of rings)
    for (const p of ring) {
      const c = n[0] * p[0] + n[1] * p[1]
      cmin = Math.min(cmin, c)
      cmax = Math.max(cmax, c)
    }
  const c0 = n[0] * base[0] + n[1] * base[1]
  const [ja, jb] = [(cmin - c0) / dy, (cmax - c0) / dy]
  const jmin = Math.ceil(Math.min(ja, jb))
  const jmax = Math.floor(Math.max(ja, jb))
  if (jmax - jmin > limit) return false

  const dashes = line.dashes.map((d) => d * k)
  const period = dashes.reduce((s, d) => s + Math.abs(d), 0)
  for (let j = jmin; j <= jmax; j++) {
    const b: Xy = [
      base[0] + j * (dx * u[0] + dy * n[0]),
      base[1] + j * (dx * u[1] + dy * n[1]),
    ]
    const ts = insideIntervals(rings, b, u, n)
    for (let i = 0; i + 1 < ts.length; i += 2) {
      const [ta, tb] = [ts[i], ts[i + 1]]
      if (tb - ta < 1e-9) continue
      const emit = (s: number, e: number) => {
        out.push(
          b[0] + u[0] * s,
          b[1] + u[1] * s,
          b[0] + u[0] * e,
          b[1] + u[1] * e,
        )
      }
      if (!dashes.length || period <= 0) {
        emit(ta, tb)
      } else {
        // Walk the dash sequence from the period holding ta.
        let pos = Math.floor(ta / period) * period
        while (pos <= tb) {
          for (const d of dashes) {
            const len = Math.abs(d)
            if (d >= 0) {
              const s = Math.max(pos, ta)
              const e = Math.min(pos + len, tb)
              if (len === 0 ? pos >= ta && pos <= tb : e > s) emit(s, e)
            }
            pos += len
          }
          if (out.length / 4 > limit) return false
        }
      }
      if (out.length / 4 > limit) return false
    }
  }
  return true
}

/**
 * A hatched region: `rings` are real-world polygons (mm, y down); several rings combine
 * even–odd, so an inner ring cuts a hole. Returns one `lines` prim (plus outlines when
 * asked); an empty or invalid region draws nothing.
 */
export function hatch(
  v: View,
  rings: ReadonlyArray<ReadonlyArray<Pt>>,
  name: HatchName,
  o: HatchOpts,
): Array<Prim> {
  const clean = rings.filter(
    (r) =>
      r.length >= 3 &&
      r.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
  )
  const positive = (n: number) => n > 0 && Number.isFinite(n)
  if (!clean.length || !positive(v.scale)) return []
  // Work on the sheet with y flipped up: the pattern data is AutoCAD's (y up).
  const up = clean.map((r) =>
    r.map((p): Xy => {
      const s = toSheet(v, p)
      return [s.x, -s.y]
    }),
  )
  const po = o.origin
  const so = toSheet(
    v,
    po && Number.isFinite(po.x) && Number.isFinite(po.y) ? po : { x: 0, y: 0 },
  )
  const rot = Number.isFinite(o.angle) ? (o.angle ?? 0) : 0
  const origin: Xy = [so.x, -so.y]
  const out: Array<Prim> = []
  if (o.outline) {
    for (const r of clean)
      out.push({
        kind: 'polyline',
        pts: r.map((p) => toSheet(v, p)),
        closed: true,
        weight: o.outline,
      })
  }

  // A bad pattern scale still leaves the asked-for outline.
  if (!positive(o.scale)) return out
  const pattern = HATCH_PATTERNS[name]
  let k = o.scale * v.scale
  const unitGap = solidGap(pattern.lines)
  while (unitGap * k < MIN_HATCH_GAP) k *= 2
  for (let attempt = 0; attempt < 6; attempt++, k *= 2) {
    const segs: Array<number> = []
    const ok = pattern.lines.every((line) =>
      family(line, up, k, rot, origin, segs, MAX_HATCH_SEGS),
    )
    if (!ok || segs.length / 4 > MAX_HATCH_SEGS) continue
    for (let i = 1; i < segs.length; i += 2) segs[i] = -segs[i]
    if (segs.length)
      out.unshift({ kind: 'lines', segs, weight: o.weight ?? pattern.weight })
    return out
  }
  // Still too many strokes after 6 doublings: outline only.
  return out
}
