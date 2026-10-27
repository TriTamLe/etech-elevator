// Frame geometry in mm, measured on the reference set (page 2, landscape): ruling lines from
// `pdftocairo -svg`, text boxes and sizes from `pdftotext -bbox` + Tinos widths. Baselines,
// not box tops. Change numbers here, never inside the drawing functions.

/** Plot boundary (thin line at the paper edge) and the drawing border. */
export const BORDER = {
  // The reference plot is 420.16 mm wide; on an exact 420 × 297 sheet keep an even 0.2 inset.
  outer: { x: 0.2, y: 0.2, w: 419.6, h: 296.6 },
  inner: { x: 14.4, y: 7.2, w: 398.7, h: 282.8 },
} as const

export const INNER_RIGHT = BORDER.inner.x + BORDER.inner.w // 413.1
export const INNER_BOTTOM = BORDER.inner.y + BORDER.inner.h // 290.0

/** Revision table along the top edge, left of the title block. */
export const REVISION = {
  top: 7.2,
  headerBottom: 14.3,
  rowHeight: 7,
  /** Column boundaries, left to right (9 lines → 8 columns). */
  cols: [14.4, 30.9, 61.4, 90.7, 123.8, 157.0, 190.1, 223.3, 342.4],
  headerBaseline: 11.7,
  /** Baseline offset from a data row's top. */
  rowBaseline: 4.6,
  size: 3.13,
  minSize: 2.2,
  /** Text inset from the column rules. */
  pad: 0.8,
} as const

/** Title block column on the right. */
export const TITLE = {
  left: 342.4,
  right: INNER_RIGHT,
  /** Text inset from the left / right rules. */
  pad: 0.8,
  center: 377.75,
  small: 3.13,
  medium: 3.66,
  large: 4.17,
  value: 4.09,
  minSize: 2.5,

  issued: {
    top: 7.2,
    bottom: 21.3,
    headBaseline: 14.1,
    subBaseline: 18.8,
    /** Row boundaries of the 6 document types. */
    rows: [21.3, 27.0, 32.6, 38.3, 43.9, 49.6, 55.2],
    labelX: 343.2,
    englishX: 383.7,
    box: { x: 373.2, size: 2.8, inset: 1.5 },
    /** Baseline offset above a row's bottom rule. */
    baselineUp: 1.0,
  },
  approval: { bottom: 69.4, headBaseline: 62.2, subBaseline: 66.9 },
  /** Empty box for the investor's stamp. */
  stamp: { bottom: 104.7 },
  company: {
    bottom: 159.9,
    logo: { x: 353.65, y: 109.5, w: 53.4, h: 28.3 },
    textX: 350.9,
    textW: 58.5,
    firstBaseline: 144.3,
    lineStep: 4.3,
  },
  /** Empty box between the company and the signatures. */
  spare: { bottom: 188.2 },
  signers: {
    rows: [188.2, 198.1, 208.0, 217.9],
    cols: [361.7, 393.8],
    labelX: 343.5,
    baselineDown: 6.6,
  },
  project: {
    bottom: 240.5,
    labelBaseline: 221.7,
    nameBaseline: 229.0,
    addressLabelBaseline: 233.7,
    addressX: 365.9,
    addressBaseline: 233.9,
    addressLineStep: 4.4,
    /** Continuation lines of the address start at the left edge. */
    addressWrapX: 342.9,
  },
  part: { bottom: 254.6, labelBaseline: 244.8, valueBaseline: 250.1 },
  drawing: { bottom: 270.2, labelBaseline: 258.4, valueBaseline: 265.6 },
  code: {
    bottom: INNER_BOTTOM,
    labelBaseline: 274.7,
    circle: { x: 359.25, y: 281.5, r: 6.65 },
    prefixBaseline: 281.0,
    numberBaseline: 287.0,
    prefixSize: 4.8,
    numberSize: 5.0,
    split: { x: 377.7, y: 280.1 },
    rightX: 378.5,
    valueX: 382.4,
    revisionLabelBaseline: 273.8,
    revisionBaseline: 278.0,
    dateLabelBaseline: 283.6,
    dateBaseline: 287.1,
  },
} as const

/** Cover sheet (no title block). */
export const COVER = {
  /** Logo artwork box, the divider right of it, and the company text block. */
  logo: { x: 40.6, y: 34.3, w: 95.3, h: 49.5 },
  divider: { x: 152.1, top: 29.4, bottom: 95.1 },
  size: 10.07,
  minSize: 5,
  /** A row first shrinks to this share of `size` on one line, then wraps onto 2 lines. */
  wrapRatio: 0.7,
  shrinkStep: 0.25,
  /** Line pitch of a wrapped row, as a multiple of its font size. */
  lineGap: 1.15,
  nameCenter: 257.45,
  nameBaselines: [44.9, 57.4],
  addressX: 155.5,
  addressW: 250,
  addressBaseline: 71.7,
  addressLineStep: 13.5,
  phoneStep: 11.6,
  title: { size: 12.94, baseline: 136.8 },
  rows: { x: 30.6, right: 404.5, baselines: [172.2, 195.7, 220.7] },
  footerBaseline: 287.4,
} as const

/** Horizontal centre of the drawing border. */
export const SHEET_CENTER = BORDER.inner.x + BORDER.inner.w / 2
