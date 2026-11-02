// Geometry of the figure sheets (hoistway plan, pit, machine room) in REAL mm, measured
// in the reference DWG blocks `1.` (plan), `M2` (pit) and `1..` (machine room) of set 2
// (AH 1500, BH 1900, CW 1100, CD 1300, OP 700, walls 200). Change numbers here, never
// inside the sheet functions.
//
// Figure coordinates: x from the inner face of the left wall, y from the inner face of
// the back wall towards the landing door (down the sheet, as on the reference).

/**
 * Annotation heights (real mm, AutoCAD text height). The reference writes every label
 * at a fixed real size, so text shrinks with the drawing scale: `cadSize` turns these
 * into a sheet font size.
 */
export const CAD_TEXT = {
  /** Dimension text (DIMTXT 100 on every sheet). */
  dim: 100,
  /** "Xây chèn sau…" and the "Ghi chú" paragraph (MTEXT 80, but printed as large as the dimensions). */
  infill: 100,
  /** "*Chống thấm Pit hố thang". */
  pitNote: 100,
  /**
   * "Dầm đặt máy", "vị trí móc treo", the CPM label: MTEXT 50 in the DWG, but printed at
   * ~70 % of the dimension digits on the reference PDF.
   */
  small: 70,
  /** Em per unit of AutoCAD TrueType height (DIMTXT 100 prints at an em of ~118). */
  emPerHeight: 1.18,
  /** Baseline below the top of an MTEXT block, per unit of height. */
  topToBaseline: 0.78,
} as const

/** A label squeezed into a small space may shrink to this share of its size, then "…". */
export const MIN_TEXT_SHARE = 0.6

/** Dimension line distance from the wall's outer face (real mm). */
export const DIM_OFFSET = {
  top: 180,
  side: 125,
  depth: 230,
  bottom: 200,
} as const

/** Door arrow + label + title under a figure, from the front wall's outer face. */
export type CaptionGeometry = {
  /** Arrow base (lower triangle) below the front wall's outer face. */
  base: number
  width: number
  height: number
  /** Second triangle's shift away from the tip. */
  shift: number
  labelHeight: number
  /** Top of the label text below the arrow base. */
  labelTop: number
  /** Top of the title below the arrow base. */
  titleTop: number
  titleHeight: number
}

export const CAPTION = {
  plan: {
    base: 411,
    width: 337,
    height: 109,
    shift: 43,
    labelHeight: 100,
    labelTop: 65,
    titleTop: 295,
    titleHeight: 100,
  },
  pit: {
    base: 126,
    width: 169,
    height: 54,
    shift: 21,
    labelHeight: 80,
    labelTop: 28,
    titleTop: 265,
    titleHeight: 80,
  },
  machineRoom: {
    base: 273,
    width: 216,
    height: 70,
    shift: 27,
    labelHeight: 80,
    labelTop: 26,
    titleTop: 209,
    titleHeight: 80,
  },
} as const satisfies Record<string, CaptionGeometry>

/** Hoistway plan (DTP 03). */
export const PLAN = {
  /** Car wall thickness. */
  carWall: 20,
  /** Car's inner front face behind the front wall's inner face. */
  carFront: 285,
  /** Car entrance (outer skin) wider than OP. */
  carEntranceExtra: 40,
  /** Car rail centre outside the car's outer side. */
  railOut: 100,
  /** Counterweight symbol centre in front of the back wall's inner face. */
  cwSymbolY: 108.5,
  /** Counterweight rails: centre in front of the back wall, ± from the frame centre. */
  cwRailY: 139.5,
  cwRailX: 488,
  /** `door-co-plan` is drawn for OP 700; other widths stretch each leaf by half the difference. */
  doorBaseOp: 700,
  /** Landing floor line outside the front wall; runs this far into the opening. */
  floorLine: 25,
  floorLineIn: 58.6,
  /** Infill wedge: from the floor line to the jamb, this far inside the front face. */
  wedgeIn: 35,
  /** OP dimension line this far inside the front wall's outer face (its text sits in the wall, clear of the sills). */
  opDim: 15,
  /** CW dimension line inside the car, as a share of CD from its back (near the top, clear of the CD text); CD line from the left. */
  cwDimShare: 0.15,
  cdDimX: 112,
  /** "Xây chèn sau…" leader: target outside the front-left column, underline elbow. */
  infillTarget: { x: -98, y: 5 },
  infillElbow: { x: -146, y: 212 },
  /** "Ghi chú" paragraph: top level with the arrow label, ending this far left of the caption. */
  notesGap: 150,
  notesLineGap: 1.6,
} as const

/** Pit sheet (DTP 04): section C-C above the pit plan, sharing its x axis. */
export const PIT = {
  /** Gap between the section's slab bottom and the plan's back wall. */
  gap: 166,
  /** Ground-floor slab ledge left of the section: thickness, reach, bevel start. */
  ledgeThick: 150,
  ledgeReach: 491,
  ledgeBevel: 187,
  /** Pit slab and pit walls: concrete 200 on both reference sets (not the brick wall field). */
  slab: 200,
  /** Note "Chống thấm" underline depth and side targets, as shares of PIT. */
  noteShare: 0.563,
  noteTargetShare: 0.69,
  /** Note centre right of the pit centre. */
  noteX: 67,
  /** PIT dimension line right of the right wall's outer face. */
  pitDim: 150,
  /**
   * Pit plan's inner dimensions (both reference sheets, measured on the PDF since the
   * DWG pit is not drawn to its numbers): AH line this far behind the front wall's
   * inner face, BH line this far right of the left wall's inner face.
   */
  planWidthDim: 600,
  planDepthDimX: 230,
} as const

/** Machine room sheet (DTP 08). */
export const MACHINE_ROOM = {
  /** CPM opening wedge below the front wall at the opening's right end. */
  cpmWedge: 50,
  /** Hook dimension lines: horizontal one behind the hook, vertical one left of it. */
  hookDimBack: 525,
  hookDimLeft: 360,
  /** Room a flipped-back dimension needs past its line (text included) before the wall. */
  hookDimRoom: 200,
  /**
   * "vị trí móc treo": underline starts this far right of the hook (clear of the
   * setting-out extension line through the hook) and this far behind it; the leader
   * runs from its right end down to the hook.
   */
  hookNote: { x: 60, y: -170 },
  /** Real height the note needs above its underline; with less room it goes below. */
  hookNoteRoom: 130,
  /** Underline below the hook when the note is flipped (text sits above it). */
  hookNoteBelow: 260,
} as const
