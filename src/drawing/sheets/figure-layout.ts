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

/**
 * Landing door sheets (DTP 06/07), measured in blocks `M6` (wide jamb) and `M5` (narrow
 * jamb) of set 2. Those blocks are NOT drawn to their numbers (M6's 2300 is drawn 2400,
 * OP 700 as 750, AH 1500 as 1600), so only clearances and annotation positions come from
 * them; the figure itself is drawn to the real values.
 *
 * Coordinates: x from the inner face of the left wall (as on the plan); elevations have
 * y = −height above the landing floor, the plans y from the front wall's inner face
 * (0) to its outer face (wall thickness), down the sheet towards the landing.
 */
export const LANDING = {
  text: {
    /** Every dimension (PO 02/11/2026: one size, as on set 1; DWG A4-20 `\H2x` = 60). */
    dim: 60,
    /** "Phần chừa trống…" notes. */
    note: 60,
    /** "Wide jamb GF (JD320)". */
    jamb: 90,
    /** Two title lines under the figures. */
    title: 80,
  },
  /** Gap between the rough figure's right wall and the finished one's left wall. */
  columnGap: 850,
  /** Landing floor (elevation) to the plan's front-wall inner face. */
  planGap: 900,
  /** Wall shown above the lintel's top, ending in the break line. */
  above: 500,
  /** Side walls drawn behind the plan's front wall, ending in the break line. */
  planDepth: 400,
  /** Break line: bump half-run and height, run past the outer walls. */
  breakHalf: 50,
  breakAmp: 100,
  breakOver: 75,
  /** Jamb label's baseline above the lintel's top. */
  jambLabelUp: 60,
  /** Centre line past the elevation floor / into the shaft and past the plan's outer face. */
  centreBelow: 31,
  planCentreIn: 124,
  planCentreOut: 21,
  /**
   * Rough elevation's upright note: the two lines' baselines left / right of the centre
   * line, reading up from this height.
   */
  upNote: { left: 67, right: 89, from: 789 },
  /**
   * Rough plan's note: line 1 baseline this far into the shaft, starting this far left of
   * the centre; its arrow points into the opening, inside the front wall.
   */
  planNote: { baseline: 180, left: 455, tipX: 250, tipIn: 74 },
  /** Dimension lines (real mm from the face they measure off). */
  dims: {
    /** Rough elevation: lintel + rough height, left of the left wall. */
    roughHeight: 217,
    /** Call box hole: bottom + height, right of the right wall; width above the hole. */
    callBoxSide: 96,
    callBoxTop: 93,
    /** Elevation bottom chains below the floor (rough / finished). */
    roughBottom: 108,
    finishedBottom: 130,
    /** "Hoistway Width AH" below the finished elevation and below both plans' outer face. */
    elevationAh: 300,
    planAh: 355,
    /** Rough plan's side | LỖ CHỜ | side chain below the outer face. */
    planChain: 135,
    /** Finished elevation: HH (+ jamb head) and the rough height, left of the left wall. */
    hh: 106,
    finishedHeight: 220,
    /** Finished plan's OP below the outer face. */
    planOp: 190,
  },
  /** Floor indicator (wide jamb): centre above HH; its ANSI34 window. */
  indicator: { up: 100, window: { w: 250, h: 50 } },
  /** `door-front` / `jamb-*` / `door-co-plan` are drawn for these. */
  baseOp: 700,
  baseHh: 2100,
  /**
   * `jamb-wide-plan` (left plate) in `door-co-plan`'s frame: at the inner edge of the
   * door's left U-profile, which moves with the leaf stretch.
   */
  jambPlan: { x: -325, y: 34.56 },
  /** Hatch pattern scales (all from the DWG). */
  hatch: {
    concrete: 20,
    brick: 20,
    /** Narrow-jamb plans hatch the front brick with BRSTONE. */
    brstone: 80,
    frame: 100,
    indicator: 50,
  },
  /** Arrow + two title lines, below the plans' outer face (M5). */
  caption: {
    base: 495,
    width: 253,
    height: 82,
    shift: 33,
    /** Top of line 1 below the arrow base; line pitch. */
    top: 52,
    pitch: 133,
  },
} as const

/**
 * Vertical section (DTP 05), measured in block `M7` of set 2. M7 is a diagram: floors are
 * drawn 3400 / 3000 high and labelled "THEO THỰC TẾ", OH 3600 is drawn 3000, BH and AH
 * are not to their numbers. PO 02/11/2026: every floor (or collapsed group) gets the
 * same drawn height `slot`; OH, the top room, PIT, openings and beams are drawn to the
 * real numbers.
 *
 * Coordinates: elevation y = −height above the 1F landing floor. Side view (BH) x from
 * the front (door) wall's inner face towards the back wall; front view (AH) x from the
 * left wall's inner face, placed right of the side view.
 */
export const SECTION = {
  text: {
    /** Leader notes. */
    note: 100,
    /** Floor names (MTEXT 100 with `\\H1.5x`). */
    level: 150,
    /** Dimension text: every M7 dimension overrides Standard-40's DIMTXT 70 with 100. */
    dim: 100,
    /** Section letters A / B / C. */
    mark: 400,
    /** "CPM 800 X 1500" in the top room (both sets, measured on the PDFs). */
    cpm: 75,
  },
  /** Standard-40's DIMASZ and DIMGAP (real mm). */
  dimArrow: 40,
  dimGap: 20,
  /** Drawn height of a floor or a collapsed group (M7 1F and 2F~3F). */
  slot: 3400,
  /** Landing slab in front of the door wall: reach, thickness, bevel under its tip. */
  landing: { reach: 754, thick: 150, bevel: 150 },
  /** The top room floor's landing slab reaches further (same thickness). */
  topLanding: { reach: 955, bevel: 187 },
  /**
   * CPM seen edge-on (side view): a `frame`-wide outline with inner lines this far in,
   * its outer face on the door wall's (set 2), roof underside to top room floor. The
   * label's baseline sits `below` the roof underside and ends `gap` short of the frame;
   * its underline runs on to the frame.
   */
  cpm: { frame: 50, lines: [20, 25, 30], below: 239, gap: 200 },
  /** Machine platform on the top room floor, mid door wall to the back wall (PDFs). */
  platform: 200,
  /**
   * Equipment (side view, x from the door wall's inner face; M7). Car side, bound to
   * the door wall: car (`bc`, `below` the top floor), its pulley (`tl`), rope hitch
   * (scale 0.5) on its bracket, buffer F. Counterweight side, bound to the back wall:
   * the machine (mirrored, sheave centre `sheave` above the top room floor and
   * `centre` below the symbol's centre), counterweight (`up` above the pit floor) and
   * buffer U.
   */
  car: { x: 682.1, below: 607 },
  pulley: { x: 375.6, below: 176.8 },
  hitch: { x: 369.5, top: 553.5, scale: 0.5 },
  bracket: { x: 375.7, top: 418.5 },
  machine: { fromBack: 351, sheave: 500, centre: 6.7, radius: 160 },
  counterweight: { fromBack: 191, up: 448 },
  /** Buffer F from the door wall, buffer U from the back / right wall. */
  buffers: { car: 947.1, counterweight: 179.5 },
  /**
   * Ropes: from the hitch (`hitchTop` above the top room floor) down to the car pulley
   * (`hitchBottom` below the top floor); from the pulley's right end (`carX`,
   * `carBottom` below the top floor) up to the sheave.
   */
  ropes: { hitchTop: 350, hitchBottom: 409, carX: 1099, carBottom: 300 },
  /**
   * `landing-door-side` insertion: this far into the shaft from the door wall's inner
   * face (its left edge sits in the wall) and this far below the landing floor.
   */
  doorSide: { x: 24.2, down: 25 },
  /** Roof slab over the top room and its reach in front of the door wall. */
  roof: { thick: 150, reach: 1000 },
  /** Pit slab under the pit (as on the pit sheet). */
  pitSlab: 200,
  /**
   * Floor names: text top above the floor, ending `gap` left of the outermost dimension
   * line (M7 starts them 2424 left of the door wall; long names would reach the line).
   */
  level: { top: 278, gap: 150 },
  /** Dimension lines left of the door wall's outer face (side view). */
  sideDims: { door: 371, opening: 699, chain: 1300, total: 1700 },
  /** Dimension lines left of the left wall's outer face (front view). */
  frontDims: { chain: 405, oh: 741, total: 1267 },
  /** "BH" / "AH" below the pit slab. */
  bottomDim: 282,
  /** Side view's back wall outer face to the front view's left wall outer face. */
  viewGap: 4591,
  /**
   * Section marks: left of the side view / right of the front view (to the letter);
   * cut lines B above the top room floor, A above the top floor, C a share of PIT down.
   */
  marks: { left: 2752, right: 1041, length: 900, b: 550, a: 1230, c: 0.855 },
  /** Break line across a collapsed group, this far under the floor above it. */
  breakBelow: 520,
  /** Break lines run past the walls (side view: past the dims and notes). */
  breakOver: { side: 1400, front: 500 },
  hatch: {
    concrete: 10,
    /**
     * Brick walls: AR-B816C. M7 uses 5, but its rows then print 0.5 mm apart at this
     * sheet's scale and the double lines fill in; 7.5 gives the reference's printed
     * ~0.8 mm rows.
     */
    brick: 7.5,
  },
} as const
