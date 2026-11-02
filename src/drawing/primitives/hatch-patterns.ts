import type { Weight } from '#/drawing/types'

// AutoCAD hatch patterns used on the reference sheets, in .pat form at scale 1 (y up,
// angles counter-clockwise, as AutoCAD defines them). Read from the HATCH entities of the
// reference DWG (their stored lines divided by the pattern scale), so they draw exactly
// what the reference does. The DWG's scales: AR-CONC 10 (plan, machine room, section) or
// 20 (doors, pit), AR-BRSTD 20, ANSI31/32 100, ANSI34 50, BRSTONE 80, AR-B816C 5.

/**
 * One family of parallel lines: through `origin`, at `angle`; the next line is `delta`
 * away (x along the line, y across it); `dashes` alternate pen down (≥ 0, 0 = dot) and
 * pen up (< 0), empty = solid.
 */
export type PatternLine = {
  angle: number
  origin: readonly [number, number]
  delta: readonly [number, number]
  dashes: ReadonlyArray<number>
}

export type HatchPattern = {
  /** Vietnamese name for the gallery. */
  label: string
  /**
   * Default stroke. The reference plots concrete heavier than its line work, so its
   * tiny triangles read as solid specks.
   */
  weight: Weight
  lines: ReadonlyArray<PatternLine>
}

// One pattern line per row, like the .pat source.
// prettier-ignore
export const HATCH_PATTERNS = {
  'AR-CONC': {
    label: 'Bê tông',
    weight: 'medium',
    lines: [
      { angle: 50, origin: [0, 0], delta: [4.12975, -5.897895], dashes: [0.75, -8.25] },
      { angle: 355, origin: [0, 0], delta: [-2.037812, 7.372368], dashes: [0.6, -6.6] },
      { angle: 100.451444, origin: [0.597717, -0.052293], delta: [5.730587, -6.939767], dashes: [0.637402, -7.011421] },
      { angle: 46.1842, origin: [0, 2], delta: [6.194626, -8.846846], dashes: [1.125, -12.375] },
      { angle: 96.635635, origin: [0.889367, 1.862067], delta: [8.595882, -10.40965], dashes: [0.956103, -10.517138] },
      { angle: 351.184164, origin: [0, 2], delta: [7.743275, 11.058557], dashes: [0.9, -9.9] },
      { angle: 21, origin: [1, 1.5], delta: [4.12975, -5.897895], dashes: [0.75, -8.25] },
      { angle: 326, origin: [1, 1.5], delta: [-2.037812, 7.372368], dashes: [0.6, -6.6] },
      { angle: 71.451445, origin: [1.497423, 1.164484], delta: [5.730587, -6.939767], dashes: [0.637402, -7.011421] },
      { angle: 37.5, origin: [0, 0], delta: [2.123, 2.567], dashes: [0, -6.52, 0, -6.7, 0, -6.625] },
      { angle: 7.5, origin: [0, 0], delta: [3.123, 3.567], dashes: [0, -3.82, 0, -6.37, 0, -2.525] },
      { angle: 327.5, origin: [-2.23, 0], delta: [4.6234, 2.678], dashes: [0, -2.5, 0, -7.8, 0, -10.35] },
      { angle: 317.5, origin: [-3.23, 0], delta: [3.6234, 4.678], dashes: [0, -3.25, 0, -5.18, 0, -7.35] },
    ],
  },
  'AR-BRSTD': {
    label: 'Gạch',
    weight: 'thin',
    lines: [
      { angle: 0, origin: [0, 0], delta: [0, 2.667], dashes: [] },
      { angle: 90, origin: [0, 0], delta: [2.667, 4], dashes: [2.667, -2.667] },
    ],
  },
  ANSI31: {
    label: 'Gạch chéo',
    weight: 'thin',
    lines: [{ angle: 45, origin: [0, 0], delta: [0, 0.125], dashes: [] }],
  },
  ANSI32: {
    label: 'Thép',
    weight: 'thin',
    lines: [
      { angle: 45, origin: [0, 0], delta: [0, 0.375], dashes: [] },
      { angle: 45, origin: [0.176777, 0], delta: [0, 0.375], dashes: [] },
    ],
  },
  ANSI34: {
    label: 'Chéo 4 nét',
    weight: 'thin',
    lines: [
      { angle: 45, origin: [0, 0], delta: [0, 0.75], dashes: [] },
      { angle: 45, origin: [0.176777, 0], delta: [0, 0.75], dashes: [] },
      { angle: 45, origin: [0.353553, 0], delta: [0, 0.75], dashes: [] },
      { angle: 45, origin: [0.53033, 0], delta: [0, 0.75], dashes: [] },
    ],
  },
  BRSTONE: {
    label: 'Gạch đá',
    weight: 'thin',
    lines: [
      { angle: 0, origin: [0, 0], delta: [0, 0.33], dashes: [] },
      { angle: 90, origin: [0.9, 0], delta: [0.33, 0.5], dashes: [0.33, -0.33] },
      { angle: 90, origin: [0.8, 0], delta: [0.33, 0.5], dashes: [0.33, -0.33] },
      { angle: 0, origin: [0.9, 0.055], delta: [0.5, 0.33], dashes: [-0.9, 0.1] },
      { angle: 0, origin: [0.9, 0.11], delta: [0.5, 0.33], dashes: [-0.9, 0.1] },
      { angle: 0, origin: [0.9, 0.165], delta: [0.5, 0.33], dashes: [-0.9, 0.1] },
      { angle: 0, origin: [0.9, 0.22], delta: [0.5, 0.33], dashes: [-0.9, 0.1] },
      { angle: 0, origin: [0.9, 0.275], delta: [0.5, 0.33], dashes: [-0.9, 0.1] },
    ],
  },
  'AR-B816C': {
    label: 'Gạch block 8×16',
    weight: 'thin',
    lines: [
      { angle: 0, origin: [0, 0], delta: [8, 8], dashes: [15.625, -0.375] },
      { angle: 0, origin: [-8, 0.375], delta: [8, 8], dashes: [15.625, -0.375] },
      { angle: 90, origin: [0, 0], delta: [8, 8], dashes: [-8.375, 7.625] },
      { angle: 90, origin: [-0.375, 0], delta: [8, 8], dashes: [-8.375, 7.625] },
    ],
  },
} as const satisfies Record<string, HatchPattern>

export type HatchName = keyof typeof HATCH_PATTERNS

export const HATCH_NAMES = Object.keys(HATCH_PATTERNS) as Array<HatchName>
