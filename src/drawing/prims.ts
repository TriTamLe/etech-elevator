import { ellipsize, fitSize } from '#/drawing/text-metrics'
import type { FontStyle } from '#/drawing/text-metrics'
import type {
  ImagePrim,
  LinePrim,
  Prim,
  RectPrim,
  TextPrim,
  Weight,
} from '#/drawing/types'

// Small builders so sheet code reads like the drawing, not like object literals.

export function hline(
  y: number,
  x1: number,
  x2: number,
  weight?: Weight,
): LinePrim {
  return { kind: 'line', a: { x: x1, y }, b: { x: x2, y }, weight }
}

export function vline(
  x: number,
  y1: number,
  y2: number,
  weight?: Weight,
): LinePrim {
  return { kind: 'line', a: { x, y: y1 }, b: { x, y: y2 }, weight }
}

export function rect(
  r: { x: number; y: number; w: number; h: number },
  opts: Pick<RectPrim, 'weight' | 'fill'> = {},
): RectPrim {
  return { kind: 'rect', ...r, ...opts }
}

type TextOpts = FontStyle & Pick<TextPrim, 'anchor'>

export function text(
  x: number,
  y: number,
  value: string,
  size: number,
  opts: TextOpts = {},
): TextPrim {
  return { kind: 'text', x, y, text: value, size, ...opts }
}

/**
 * One line of text shrunk to fit `maxW` (not below `minSize`), then cut with "…" if it
 * still does not fit. Empty text draws nothing.
 */
export function fittedText(
  x: number,
  y: number,
  value: string,
  maxW: number,
  size: number,
  minSize: number,
  opts: TextOpts = {},
): Array<Prim> {
  const v = value.trim()
  if (!v) return []
  const s = fitSize(v, maxW, size, minSize, opts)
  return [text(x, y, ellipsize(v, maxW, s, opts), s, opts)]
}

/** Image scaled to fit inside `box` keeping its aspect ratio, centred. */
export function imageContain(
  href: string,
  aspect: number,
  box: { x: number; y: number; w: number; h: number },
): ImagePrim {
  const w = Math.min(box.w, box.h * aspect)
  const h = w / aspect
  return {
    kind: 'image',
    href,
    x: box.x + (box.w - w) / 2,
    y: box.y + (box.h - h) / 2,
    w,
    h,
  }
}
