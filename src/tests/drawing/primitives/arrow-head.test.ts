import { describe, expect, it } from 'vitest'

import { arrowHead } from '#/drawing/primitives/arrow-head'
import { numbersOf } from '#/tests/drawing/helpers'

describe('arrowHead', () => {
  it('tam giác kín tô đặc, nét thin, đỉnh đúng tại tip', () => {
    const a = arrowHead({ x: 10, y: 20 }, { x: 1, y: 0 }, 3, 1)
    expect(a.kind).toBe('polyline')
    expect(a.closed).toBe(true)
    expect(a.fill).toBe('ink')
    expect(a.weight).toBe('thin')
    expect(a.pts).toHaveLength(3)
    expect(a.pts[0]).toEqual({ x: 10, y: 20 })
  })

  it('hướng +x: đáy lùi `length` về phía sau, rộng `width`', () => {
    const a = arrowHead({ x: 10, y: 20 }, { x: 1, y: 0 }, 3, 1)
    const [, p1, p2] = a.pts
    expect(p1.x).toBeCloseTo(7, 12)
    expect(p2.x).toBeCloseTo(7, 12)
    expect(Math.abs(p1.y - p2.y)).toBeCloseTo(1, 12)
    expect((p1.y + p2.y) / 2).toBeCloseTo(20, 12)
  })

  it('độ dài của dir không ảnh hưởng (chuẩn hóa)', () => {
    const a = arrowHead({ x: 0, y: 0 }, { x: 0, y: 1 }, 2, 0.6)
    const b = arrowHead({ x: 0, y: 0 }, { x: 0, y: 250 }, 2, 0.6)
    expect(b).toEqual(a)
  })

  it('hướng chéo: khoảng cách đỉnh → trung điểm đáy = length, đáy vuông góc trục', () => {
    const tip = { x: 5, y: 5 }
    const a = arrowHead(tip, { x: 1, y: 1 }, 4, 2)
    const [, p1, p2] = a.pts
    const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
    expect(Math.hypot(tip.x - mid.x, tip.y - mid.y)).toBeCloseTo(4, 12)
    expect(Math.hypot(p1.x - p2.x, p1.y - p2.y)).toBeCloseTo(2, 12)
    // (p1 − p2) · (tip − mid) = 0
    const dot =
      (p1.x - p2.x) * (tip.x - mid.x) + (p1.y - p2.y) * (tip.y - mid.y)
    expect(dot).toBeCloseTo(0, 12)
  })

  it('dir = (0, 0) không ra NaN', () => {
    const a = arrowHead({ x: 3, y: 4 }, { x: 0, y: 0 }, 2, 1)
    for (const n of numbersOf(a)) expect(Number.isFinite(n)).toBe(true)
  })

  it('gọi 2 lần ra kết quả giống hệt', () => {
    const f = () => arrowHead({ x: 1, y: 2 }, { x: -3, y: 1 }, 1.02, 0.34)
    expect(f()).toEqual(f())
  })
})
