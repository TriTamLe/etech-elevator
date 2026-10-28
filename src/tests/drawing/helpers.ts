import { BORDER } from '#/drawing/frame/layout'
import { measure } from '#/drawing/text-metrics'
import type { Prim, TextPrim } from '#/drawing/types'

export function numbersOf(p: Prim): Array<number> {
  switch (p.kind) {
    case 'line':
      return [p.a.x, p.a.y, p.b.x, p.b.y]
    case 'rect':
      return [p.x, p.y, p.w, p.h]
    case 'circle':
      return [p.c.x, p.c.y, p.r]
    case 'polyline':
      return p.pts.flatMap((q) => [q.x, q.y])
    case 'arc':
      return [p.c.x, p.c.y, p.r, p.start, p.end]
    case 'text':
      return [p.x, p.y, p.size]
    case 'image':
      return [p.x, p.y, p.w, p.h]
  }
}

export function pointsOf(p: Prim): Array<[number, number]> {
  switch (p.kind) {
    case 'line':
      return [
        [p.a.x, p.a.y],
        [p.b.x, p.b.y],
      ]
    case 'rect':
    case 'image':
      return [
        [p.x, p.y],
        [p.x + p.w, p.y + p.h],
      ]
    case 'circle':
    case 'arc':
      // Whole circle: a safe outer bound for the arc.
      return [
        [p.c.x - p.r, p.c.y - p.r],
        [p.c.x + p.r, p.c.y + p.r],
      ]
    case 'polyline':
      return p.pts.map((q) => [q.x, q.y])
    case 'text':
      return [[p.x, p.y]]
  }
}

export const texts = (prims: Array<Prim>) =>
  prims.filter((p): p is TextPrim => p.kind === 'text')

export function textSpan(t: TextPrim): [number, number] {
  const w = measure(t.text, t.size, { bold: t.bold, italic: t.italic })
  const a = t.anchor ?? 'start'
  const x0 = a === 'start' ? t.x : a === 'middle' ? t.x - w / 2 : t.x - w
  return [x0, x0 + w]
}

export const INNER = {
  left: BORDER.inner.x,
  right: BORDER.inner.x + BORDER.inner.w,
}
