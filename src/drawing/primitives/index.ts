// Shared drawing elements for the figure sheets: real-mm → sheet mapping and scale
// choice, dimensions, hatching, leader notes and the small marks of the reference set.

export { FIT_SCALES, fitScale } from '#/drawing/primitives/fit-scale'
export type {
  Area,
  FitOpts,
  Pad,
  RealBox,
} from '#/drawing/primitives/fit-scale'
export { len, toSheet, view } from '#/drawing/primitives/view'
export type { View } from '#/drawing/primitives/view'
export {
  DIM_RATIO,
  dim,
  dimChain,
  dimStyle,
  plainLabel,
  prefixLabel,
} from '#/drawing/primitives/dimension'
export type {
  ChainOpts,
  DimLabel,
  DimOpts,
  DimStyle,
} from '#/drawing/primitives/dimension'
export {
  MAX_HATCH_SEGS,
  MIN_HATCH_GAP,
  hatch,
} from '#/drawing/primitives/hatch'
export type { HatchOpts } from '#/drawing/primitives/hatch'
export {
  HATCH_NAMES,
  HATCH_PATTERNS,
} from '#/drawing/primitives/hatch-patterns'
export type { HatchName } from '#/drawing/primitives/hatch-patterns'
export { arrowHead } from '#/drawing/primitives/arrow-head'
export { LEADER_LINE_GAP, leader } from '#/drawing/primitives/leader'
export type { LeaderOpts } from '#/drawing/primitives/leader'
export { BREAK_GAP, breakLine } from '#/drawing/primitives/break-line'
export { DOOR_ARROW, doorArrow } from '#/drawing/primitives/door-arrow'
export { SECTION_MARK, sectionMark } from '#/drawing/primitives/section-mark'
export { table } from '#/drawing/primitives/table'
export type { TableCell, TableRow } from '#/drawing/primitives/table'
