import { SHEET_AREA } from '#/drawing/frame/layout'
import { view } from '#/drawing/primitives/view'
import type { View } from '#/drawing/primitives/view'

// Pick the drawing scale for a figure: the reference sheets print no scale and blow each
// figure up to nearly fill the sheet (the hoistway plan sits near 1:15), so the list is
// denser than the usual 1:10 / 1:20 / 1:50 steps while staying round (PO, 02/11/2026).

/** Allowed scales 1:n, largest drawing first. */
export const FIT_SCALES: ReadonlyArray<number> = [
  10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 200,
]

export type Area = { left: number; top: number; right: number; bottom: number }
export type Pad = { top: number; right: number; bottom: number; left: number }

export type FitOpts = {
  /** Sheet area to fill (mm); defaults to a framed sheet's drawing area. */
  area?: Area
  /**
   * Sheet mm kept free around the figure for what does not scale with it: dimension
   * lines, their text, labels. A number pads all four sides.
   */
  pad?: number | Partial<Pad>
  scales?: ReadonlyArray<number>
}

/** Real-world bounds of a figure (mm, y down). */
export type RealBox = { x: number; y: number; w: number; h: number }

const EPS = 1e-9

/**
 * The largest drawing (smallest n) at which `box` fits the padded area, centred in it.
 * When nothing fits, the smallest drawing with `fits: false`; a box with NaN in it (a
 * blank form field) gets the same, centred on the area, instead of throwing.
 */
export function fitScale(
  box: RealBox,
  opts: FitOpts = {},
): View & { fits: boolean } {
  const area = opts.area ?? SHEET_AREA
  // Missing or non-finite pads count as 0.
  const side = (v: number | undefined) =>
    Number.isFinite(v) ? (v as number) : 0
  const all = typeof opts.pad === 'number' ? opts.pad : undefined
  const pp = typeof opts.pad === 'object' ? opts.pad : {}
  const p = {
    top: side(all ?? pp.top),
    right: side(all ?? pp.right),
    bottom: side(all ?? pp.bottom),
    left: side(all ?? pp.left),
  }
  const scales = opts.scales?.length ? opts.scales : FIT_SCALES
  const left = area.left + p.left
  const top = area.top + p.top
  const availW = area.right - p.right - left
  const availH = area.bottom - p.bottom - top
  const cx = left + availW / 2
  const cy = top + availH / 2

  const sane = [box.x, box.y, box.w, box.h].every(Number.isFinite)
  if (!sane) {
    return { ...view(scales[scales.length - 1], { x: cx, y: cy }), fits: false }
  }
  const w = Math.abs(box.w)
  const h = Math.abs(box.h)
  const fitting = scales.find(
    (n) => w / n <= availW + EPS && h / n <= availH + EPS,
  )
  const n = fitting ?? scales[scales.length - 1]
  // Centre the box: origin = centre of the area − centre of the box at this scale.
  const bx = Math.min(box.x, box.x + box.w)
  const by = Math.min(box.y, box.y + box.h)
  const origin = { x: cx - (bx + w / 2) / n, y: cy - (by + h / 2) / n }
  return { ...view(n, origin), fits: fitting !== undefined }
}
