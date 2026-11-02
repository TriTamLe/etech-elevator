import { describe, expect, it } from 'vitest'

import { SHEET_AREA } from '#/drawing/frame/layout'
import { toSheet, view } from '#/drawing/primitives'
import type { View } from '#/drawing/primitives'
import {
  box,
  cadSize,
  cadText,
  callBoxHole,
  callBoxPlan,
  fitFigure,
  primsBounds,
} from '#/drawing/sheets/figure'
import { CAD_TEXT } from '#/drawing/sheets/figure-layout'
import { presetParams } from '#/domain/presets'
import type { ElevatorParams } from '#/domain/schema'
import { ascent, descent, measure } from '#/drawing/text-metrics'
import type { Prim } from '#/drawing/types'
import { EPS, numbersOf, texts } from '#/tests/drawing/helpers'

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

describe('callBoxHole', () => {
  const clone = (id: 'house-5f' | 'hotel-9f' = 'house-5f') =>
    structuredClone<ElevatorParams>(presetParams(id))

  it('bộ mẫu house-5f (AH 1500, bên 200): sát mép phải lỗ chờ, 100 × 400 @ 1100', () => {
    const p = clone()
    const AH = p.tech.shaft.width
    expect(callBoxHole(p, 200)).toEqual({
      x0: AH - 200,
      x1: AH - 200 + 100,
      y0: -1100,
      y1: -1500,
    })
  })

  it('hotel-9f (AH 1800, bên 350)', () => {
    expect(callBoxHole(clone('hotel-9f'), 350)).toEqual({
      x0: 1450,
      x1: 1550,
      y0: -1100,
      y1: -1500,
    })
  })

  it('w > side: kẹp ở mép tường ngoài (x1 = AH)', () => {
    const p = clone()
    p.structure.callBox.w = 600
    expect(callBoxHole(p, 200)).toEqual({
      x0: 1300,
      x1: 1500,
      y0: -1100,
      y1: -1500,
    })
  })

  it('bottom + h > H: kẹp đỉnh tại −H', () => {
    const p = clone()
    const H = p.structure.roughOpeningHeight
    p.structure.callBox = { w: 100, h: 800, bottom: 1800 }
    const hole = callBoxHole(p, 200)!
    expect(hole.y0).toBe(-1800)
    expect(hole.y1).toBe(-H)
  })

  it('bottom ≥ H (kể cả bằng): null', () => {
    const p = clone()
    const H = p.structure.roughOpeningHeight
    p.structure.callBox = { w: 100, h: 400, bottom: H }
    expect(callBoxHole(p, 200)).toBeNull()
    p.structure.callBox.bottom = H + 100
    expect(callBoxHole(p, 200)).toBeNull()
    p.structure.callBox.bottom = H - 1
    expect(callBoxHole(p, 200)).not.toBeNull()
  })

  it('w = 0, h = 0, side = 0 hoặc âm: null', () => {
    const p = clone()
    p.structure.callBox.w = 0
    expect(callBoxHole(p, 200)).toBeNull()
    const q = clone()
    q.structure.callBox.h = 0
    expect(callBoxHole(q, 200)).toBeNull()
    expect(callBoxHole(clone(), 0)).toBeNull()
    expect(callBoxHole(clone(), -50)).toBeNull()
  })

  it('NaN ở bất kỳ đầu vào nào: null, không ném lỗi', () => {
    const p = clone()
    p.structure.callBox = { w: NaN, h: NaN, bottom: NaN }
    expect(callBoxHole(p, 200)).toBeNull()
    expect(callBoxHole(clone(), NaN)).toBeNull()
    const q = clone()
    q.structure.callBox.bottom = NaN
    expect(callBoxHole(q, 200)).toBeNull()
  })
})

describe('callBoxPlan', () => {
  const v = view(10, { x: 30, y: 40 })
  const front = 2000
  const holeOf = (w: number) => ({
    x0: 1300,
    x1: 1300 + w,
    y0: -1100,
    y1: -1500,
  })

  it.each([100, 150, 200])(
    'lỗ rộng %s: ô ⊠ rộng w·scale, mép trái ở hole.x0, đáy ở front',
    (w) => {
      const { prims } = callBoxPlan(v, holeOf(w), front)
      const b = primsBounds(prims)!
      expect(b.w).toBeCloseTo(w * v.scale, 6)
      expect(b.h).toBeCloseTo(90 * v.scale, 6)
      expect(b.x).toBeCloseTo(toSheet(v, { x: 1300, y: 0 }).x, 6)
      expect(b.y + b.h).toBeCloseTo(toSheet(v, { x: 0, y: front }).y, 6)
    },
  )

  it('ring = box(hole.x0, front − 90, w, 90)', () => {
    expect(callBoxPlan(v, holeOf(150), front).ring).toEqual(
      box(1300, front - 90, 150, 90),
    )
    expect(callBoxPlan(v, holeOf(100), front).ring).toEqual(
      box(1300, front - 90, 100, 90),
    )
  })

  it('hộp bao của prims trùng ring (đổi sang giấy)', () => {
    const { ring, prims } = callBoxPlan(v, holeOf(150), front)
    const b = primsBounds(prims)!
    const tl = toSheet(v, ring[0])
    const br = toSheet(v, ring[2])
    expect(b.x).toBeCloseTo(tl.x, 6)
    expect(b.y).toBeCloseTo(tl.y, 6)
    expect(b.x + b.w).toBeCloseTo(br.x, 6)
    expect(b.y + b.h).toBeCloseTo(br.y, 6)
  })

  it('mọi tọa độ hữu hạn', () => {
    for (const q of callBoxPlan(v, holeOf(150), front).prims)
      for (const n of numbersOf(q)) expect(Number.isFinite(n)).toBe(true)
  })
})
