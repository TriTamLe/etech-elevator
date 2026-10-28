// Symbol geometry extracted from the reference DWG (tools/extract-symbols, `yarn
// gen:symbols`). Units are mm at 1:1, origin at the symbol's insertion point, y down
// (sheet orientation). Arc angles follow ArcPrim: degrees, y down, increasing.

export type Seg =
  /** Polyline as flat [x0, y0, x1, y1, …]; `z` closes it. */
  | { t: 'l'; p: ReadonlyArray<number>; z?: true }
  /** Arc: centre, radius, start → end angle (end may exceed 360). */
  | { t: 'a'; c: readonly [number, number]; r: number; s: number; e: number }
  | { t: 'c'; c: readonly [number, number]; r: number }

/**
 * AutoCAD-style stretch line: when the symbol is stretched along `axis`, everything on
 * the `dir` side of `at` moves that way by the stretch amount; the rest stays. A door
 * widens to the right (x, +1); a symbol standing on its insertion point grows upward
 * (y, −1, since y points down).
 */
export type StretchLine = { axis: 'x' | 'y'; at: number; dir: 1 | -1 }

export type Box = { x: number; y: number; w: number; h: number }

export type SymbolData = {
  id: string
  /** Vietnamese name, for the dev gallery. */
  label: string
  /** Bounds relative to the insertion point, before any stretch. */
  bbox: Box
  /** At most one per axis. */
  stretch: ReadonlyArray<StretchLine>
  segs: ReadonlyArray<Seg>
}
