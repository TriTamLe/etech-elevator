import { describe, expect, it } from 'vitest'

import { SHEET_AREA } from '#/drawing/frame/layout'
import { view } from '#/drawing/primitives'
import type { View } from '#/drawing/primitives'
import {
  box,
  cadSize,
  cadText,
  fitFigure,
  primsBounds,
} from '#/drawing/sheets/figure'
import { CAD_TEXT } from '#/drawing/sheets/figure-layout'
import { ascent, descent, measure } from '#/drawing/text-metrics'
import type { Prim } from '#/drawing/types'
import { EPS, texts } from '#/tests/drawing/helpers'

const line = (x0: number, y0: number, x1: number, y1: number): Prim => ({
  kind: 'line',
  a: { x: x0, y: y0 },
  b: { x: x1, y: y1 },
  weight: 'thin',
})

describe('cadSize / cadText', () => {
  it('cadSize = 1,18 · h · tỷ lệ', () => {
    expect(cadSize(view(1, { x: 0, y: 0 }), 200)).toBeCloseTo(
      CAD_TEXT.emPerHeight * 200,
      9,
    )
    expect(cadSize(view(2, { x: 0, y: 0 }), 200)).toBeCloseTo(
      CAD_TEXT.emPerHeight * 100,
      9,
    )
  })

  it('cadText đặt baseline cách mép trên topToBaseline · h (thật)', () => {
    const v = view(10, { x: 10, y: 20 })
    const [t] = texts(cadText(v, 100, 50, 'abc', 100))
    expect(t.x).toBeCloseTo(10 + 100 * 0.1, 9)
    expect(t.y).toBeCloseTo(20 + (50 + CAD_TEXT.topToBaseline * 100) * 0.1, 9)
    expect(t.size).toBeCloseTo(cadSize(v, 100), 9)
  })

  it('underline thêm gạch chân (nhiều hơn 1 prim)', () => {
    const v = view(1, { x: 0, y: 0 })
    expect(cadText(v, 0, 0, 'abc', 100)).toHaveLength(1)
    expect(
      cadText(v, 0, 0, 'abc', 100, { underline: true }).length,
    ).toBeGreaterThan(1)
  })
})

describe('primsBounds', () => {
  it('không có prim → null', () => {
    expect(primsBounds([])).toBeNull()
  })

  it('bỏ qua điểm không hữu hạn', () => {
    const b = primsBounds([line(0, 0, 10, 5), line(NaN, 1, Infinity, 2)])
    expect(b).toEqual({ x: 0, y: 0, w: 10, h: 5 })
  })

  it('đường và rect', () => {
    const b = primsBounds([
      line(10, 20, 30, 40),
      { kind: 'rect', x: 5, y: 25, w: 10, h: 30 },
    ])
    expect(b).toEqual({ x: 5, y: 20, w: 25, h: 35 })
  })

  it('chữ: rộng bằng measure, cao từ ascent đến descent quanh baseline', () => {
    const size = 5
    const b = primsBounds([
      { kind: 'text', x: 100, y: 50, text: 'Hello', size },
    ])!
    expect(b.x).toBeCloseTo(100, 9)
    expect(b.w).toBeCloseTo(measure('Hello', size), 9)
    expect(b.y).toBeCloseTo(50 - ascent(size), 9)
    expect(b.h).toBeCloseTo(ascent(size) + descent(size), 9)
  })

  it('chữ anchor middle / end lệch theo nửa / cả bề rộng', () => {
    const size = 5
    const w = measure('Hello', size)
    const mid = primsBounds([
      { kind: 'text', x: 100, y: 50, text: 'Hello', size, anchor: 'middle' },
    ])!
    const end = primsBounds([
      { kind: 'text', x: 100, y: 50, text: 'Hello', size, anchor: 'end' },
    ])!
    expect(mid.x).toBeCloseTo(100 - w / 2, 9)
    expect(end.x).toBeCloseTo(100 - w, 9)
  })

  it('chữ xoay -90: chiều dài chữ chạy dọc theo y', () => {
    const size = 5
    const w = measure('Hello', size)
    const b = primsBounds([
      { kind: 'text', x: 100, y: 50, text: 'Hello', size, rotate: -90 },
    ])!
    expect(b.h).toBeCloseTo(w, 6)
    expect(b.w).toBeCloseTo(ascent(size) + descent(size), 6)
    // đọc từ dưới lên: chữ kéo lên phía trên baseline gốc
    expect(b.y).toBeCloseTo(50 - w, 6)
  })
})

describe('fitFigure', () => {
  const draw = (w: number, h: number) => (v: ReturnType<typeof view>) => [
    line(v.origin.x, v.origin.y, v.origin.x + w * v.scale, v.origin.y),
    line(v.origin.x, v.origin.y, v.origin.x, v.origin.y + h * v.scale),
  ]

  it('hình nằm trong SHEET_AREA, tỷ lệ > 0', () => {
    const { view: v, prims } = fitFigure(draw(3000, 2000))
    expect(v.scale).toBeGreaterThan(0)
    const b = primsBounds(prims)!
    expect(b.x).toBeGreaterThanOrEqual(SHEET_AREA.left - 0.01)
    expect(b.x + b.w).toBeLessThanOrEqual(SHEET_AREA.right + 0.01)
    expect(b.y).toBeGreaterThanOrEqual(SHEET_AREA.top - 0.01)
    expect(b.y + b.h).toBeLessThanOrEqual(SHEET_AREA.bottom + 0.01)
  })

  it('hình lớn hơn thì tỷ lệ nhỏ hơn', () => {
    const a = fitFigure(draw(3000, 2000)).view.scale
    const b = fitFigure(draw(6000, 4000)).view.scale
    expect(b).toBeLessThan(a)
  })

  it('hình rỗng không ném lỗi', () => {
    expect(() => fitFigure(() => [])).not.toThrow()
  })
})

describe('fitFigure: aside (ghi chú bên cạnh)', () => {
  const R = (x: number, y: number, w: number, h: number): Prim => ({
    kind: 'rect',
    x,
    y,
    w,
    h,
  })
  // Hình chính 2000 × 1000 mm thật, gốc (0, 0).
  const main = (v: View) => [
    R(v.origin.x, v.origin.y, 2000 * v.scale, 1000 * v.scale),
  ]
  const mid = (prims: Array<Prim>) => {
    const b = primsBounds(prims)!
    return b.x + b.w / 2
  }
  const areaMid = (SHEET_AREA.left + SHEET_AREA.right) / 2

  it('đủ chỗ: hình chính canh giữa theo x, aside nằm lệch về một phía', () => {
    // aside nhỏ, ở bên phải hình chính
    const aside = (v: View) => [
      R(v.origin.x + 2100 * v.scale, v.origin.y, 100 * v.scale, 100 * v.scale),
    ]
    const { view: v, prims } = fitFigure(main, aside)
    const m = primsBounds(main(v))!
    // Tỷ lệ bị chặn bởi bề cao (không phải bề rộng) nên còn chỗ để canh.
    expect(m.x + m.w / 2).toBeCloseTo(areaMid, 3)
    const all = primsBounds(prims)!
    expect(all.x).toBeGreaterThanOrEqual(SHEET_AREA.left - EPS)
    expect(all.x + all.w).toBeLessThanOrEqual(SHEET_AREA.right + EPS)
  })

  it('không aside: hình canh giữa như cũ (cả hai nhánh cho cùng tỷ lệ khi aside rỗng)', () => {
    const a = fitFigure(main)
    const b = fitFigure(main, () => [])
    expect(b.view.n).toBeCloseTo(a.view.n, 9)
    expect(mid(b.prims)).toBeCloseTo(mid(a.prims), 6)
  })

  it('aside lớn: tất cả vẫn nằm trong SHEET_AREA (kẹp), tỷ lệ nhỏ hơn không aside', () => {
    const aside = (v: View) => [
      R(v.origin.x + 2100 * v.scale, v.origin.y, 4000 * v.scale, 200 * v.scale),
    ]
    const without = fitFigure(main)
    const { view: v, prims } = fitFigure(main, aside)
    expect(v.n).toBeGreaterThanOrEqual(without.view.n)
    const all = primsBounds(prims)!
    expect(all.x).toBeGreaterThanOrEqual(SHEET_AREA.left - EPS)
    expect(all.x + all.w).toBeLessThanOrEqual(SHEET_AREA.right + EPS)
    expect(all.y).toBeGreaterThanOrEqual(SHEET_AREA.top - EPS)
    expect(all.y + all.h).toBeLessThanOrEqual(SHEET_AREA.bottom + EPS)
    // Hình chính bị đẩy lệch khỏi tâm vùng vẽ vì aside chiếm chỗ ở bên phải.
    expect(mid(main(v))).toBeLessThan(areaMid)
  })

  it('aside bên trái lớn: hình chính bị đẩy sang phải, vẫn trong vùng', () => {
    const aside = (v: View) => [
      R(v.origin.x - 3000 * v.scale, v.origin.y, 2900 * v.scale, 200 * v.scale),
    ]
    const { view: v, prims } = fitFigure(main, aside)
    const all = primsBounds(prims)!
    expect(all.x).toBeGreaterThanOrEqual(SHEET_AREA.left - EPS)
    expect(all.x + all.w).toBeLessThanOrEqual(SHEET_AREA.right + EPS)
    expect(mid(main(v))).toBeGreaterThan(areaMid)
  })
})

describe('box', () => {
  it('4 đỉnh theo chiều kim đồng hồ từ góc trên-trái', () => {
    expect(box(1, 2, 10, 20)).toEqual([
      { x: 1, y: 2 },
      { x: 11, y: 2 },
      { x: 11, y: 22 },
      { x: 1, y: 22 },
    ])
  })
})
