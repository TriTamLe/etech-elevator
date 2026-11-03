import type { ElevatorParams } from '#/domain/schema'
import type { SectionFrame, SectionLevel } from '#/drawing/sheets/section'

// The beams DTP 05 draws and annotates, as elevation ranges, shared by the drawing and
// its notes so a note always points at the beam that is drawn.

/** An elevation range (real mm above 1F): [bottom, top]. */
export type Span = [number, number]

/** Ring beam under a floor (or the top room floor) at elevation `e`. */
export const ringSpan = (p: ElevatorParams, e: number): Span => [
  e - p.structure.ringBeamFloor.h,
  e,
]

/** Mid beam whose top is `t` above level `l`'s floor. */
export const midSpan = (
  p: ElevatorParams,
  l: SectionLevel,
  t: number,
): Span => [l.floor + t - p.structure.midBeam.h, l.floor + t]

/** Ring beam under the roof slab's top. */
export const roofSpan = (p: ElevatorParams, f: SectionFrame): Span => [
  f.roofTop - p.structure.ringBeamTop.h,
  f.roofTop,
]
