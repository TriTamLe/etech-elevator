import { expect } from 'vitest'

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
    case 'lines':
      return p.segs
    case 'arc':
      return [p.c.x, p.c.y, p.r, p.start, p.end]
    case 'text':
      return [p.x, p.y, p.size, p.rotate ?? 0]
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
    case 'lines': {
      const pts: Array<[number, number]> = []
      for (let i = 0; i + 1 < p.segs.length; i += 2)
        pts.push([p.segs[i], p.segs[i + 1]])
      return pts
    }
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

export const EPS = 0.01

/**
 * Mọi điểm (theo `pointsOf`, chữ chỉ có điểm neo) nằm trong vùng, dung sai `eps`.
 * Dùng `primsBounds` (#/drawing/sheets/figure) khi cần kiểm cả bề rộng của chữ.
 */
export function expectInside(
  prims: Array<Prim>,
  area: { left: number; top: number; right: number; bottom: number },
  eps = EPS,
) {
  for (const p of prims)
    for (const [x, y] of pointsOf(p)) {
      expect(x).toBeGreaterThanOrEqual(area.left - eps)
      expect(x).toBeLessThanOrEqual(area.right + eps)
      expect(y).toBeGreaterThanOrEqual(area.top - eps)
      expect(y).toBeLessThanOrEqual(area.bottom + eps)
    }
}

/**
 * Hai tường bên của hình mặt bằng, đọc từ nét vẽ: hình chữ nhật 4 đỉnh, kín, nét medium;
 * tường bên là hình cao nhất ở mép trái / phải (cột góc thấp hơn). Trả về tọa độ giấy của
 * mặt trong hai tường (x), mép dưới tường (y = BH), và tỷ lệ k = giấy / thật.
 */
export function sideWalls(prims: Array<Prim>, width: number) {
  const rects = prims
    .filter(
      (q): q is Extract<Prim, { kind: 'polyline' }> =>
        q.kind === 'polyline' &&
        q.weight === 'medium' &&
        q.closed === true &&
        q.pts.length === 4,
    )
    .map((q) => {
      const xs = q.pts.map((a) => a.x)
      const ys = q.pts.map((a) => a.y)
      return {
        x0: Math.min(...xs),
        x1: Math.max(...xs),
        y0: Math.min(...ys),
        y1: Math.max(...ys),
      }
    })
  const minX = Math.min(...rects.map((r) => r.x0))
  const maxX = Math.max(...rects.map((r) => r.x1))
  const tallest = (rs: typeof rects) =>
    [...rs].sort((a, b) => b.y1 - b.y0 - (a.y1 - a.y0))[0]
  const left = tallest(rects.filter((r) => r.x0 === minX))
  const right = tallest(rects.filter((r) => r.x1 === maxX))
  return {
    rects,
    innerL: left.x1,
    innerR: right.x0,
    bottom: left.y1,
    k: (right.x0 - left.x1) / width,
  }
}
