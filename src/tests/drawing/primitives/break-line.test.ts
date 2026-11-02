import { describe, expect, it } from 'vitest'

import {
  BREAK_GAP,
  breakLine,
  zigzagBreak,
} from '#/drawing/primitives/break-line'
import { numbersOf } from '#/tests/drawing/helpers'

/** Khoảng cách từ điểm tới đường thẳng qua a, b. */
function distToLine(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return Math.abs(dx * (a.y - p.y) - dy * (a.x - p.x)) / Math.hypot(dx, dy)
}

describe('breakLine', () => {
  it('BREAK_GAP = 0,8 (đo từ bản vẽ mẫu)', () => {
    expect(BREAK_GAP).toBe(0.8)
  })

  it('hai đường thẳng song song, nét medium, cách nhau BREAK_GAP mặc định', () => {
    const out = breakLine({ x: 0, y: 0 }, { x: 100, y: 0 })
    expect(out).toHaveLength(2)
    for (const l of out) {
      expect(l.kind).toBe('line')
      expect(l.weight).toBe('medium')
    }
    expect(out[0].a.y).toBeCloseTo(0.4, 12)
    expect(out[1].a.y).toBeCloseTo(-0.4, 12)
    expect(Math.abs(out[0].a.y - out[1].a.y)).toBeCloseTo(BREAK_GAP, 12)
  })

  it('đường nằm ngang: không overshoot thì chạy đúng từ a.x đến b.x', () => {
    const [l1, l2] = breakLine({ x: 10, y: 20 }, { x: 110, y: 20 })
    for (const l of [l1, l2]) {
      expect(l.a.x).toBeCloseTo(10, 12)
      expect(l.b.x).toBeCloseTo(110, 12)
      expect(l.a.y).toBe(l.b.y)
    }
  })

  it('overshoot kéo dài mỗi đầu thêm đúng đoạn đó', () => {
    const [l] = breakLine({ x: 10, y: 20 }, { x: 110, y: 20 }, { overshoot: 5 })
    expect(l.a.x).toBeCloseTo(5, 12)
    expect(l.b.x).toBeCloseTo(115, 12)
  })

  it('gap tùy chỉnh và weight tùy chỉnh', () => {
    const out = breakLine(
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { gap: 2, weight: 'thin' },
    )
    expect(Math.abs(out[0].a.y - out[1].a.y)).toBeCloseTo(2, 12)
    for (const l of out) expect(l.weight).toBe('thin')
  })

  it('đường đứng: hai đường lệch trái/phải nhau BREAK_GAP', () => {
    const out = breakLine({ x: 30, y: 0 }, { x: 30, y: 40 })
    const xs = out.map((l) => l.a.x).sort((a, b) => a - b)
    expect(xs[0]).toBeCloseTo(30 - 0.4, 12)
    expect(xs[1]).toBeCloseTo(30 + 0.4, 12)
    for (const l of out) expect(l.a.x).toBeCloseTo(l.b.x, 12)
  })

  it('đường chéo: song song với a→b, mỗi đường cách trục BREAK_GAP / 2', () => {
    const a = { x: 0, y: 0 }
    const b = { x: 30, y: 40 }
    const out = breakLine(a, b, { gap: 2 })
    for (const l of out) {
      expect(distToLine(l.a, a, b)).toBeCloseTo(1, 9)
      expect(distToLine(l.b, a, b)).toBeCloseTo(1, 9)
      // song song: cùng hướng với a→b
      const cross =
        (l.b.x - l.a.x) * (b.y - a.y) - (l.b.y - l.a.y) * (b.x - a.x)
      expect(cross).toBeCloseTo(0, 9)
    }
    // hai đường nằm hai phía trục
    const side = (l: (typeof out)[number]) =>
      Math.sign((b.x - a.x) * (l.a.y - a.y) - (b.y - a.y) * (l.a.x - a.x))
    expect(side(out[0])).toBe(-side(out[1]))
  })

  it('đường chéo + overshoot: dài hơn a→b đúng 2 × overshoot', () => {
    const a = { x: 0, y: 0 }
    const b = { x: 30, y: 40 }
    const [l] = breakLine(a, b, { overshoot: 3 })
    expect(Math.hypot(l.b.x - l.a.x, l.b.y - l.a.y)).toBeCloseTo(50 + 6, 9)
  })

  it('a trùng b → []', () => {
    expect(breakLine({ x: 5, y: 5 }, { x: 5, y: 5 })).toEqual([])
  })

  it('điểm không hữu hạn → [] (không ra NaN)', () => {
    expect(breakLine({ x: NaN, y: 0 }, { x: 10, y: 0 })).toEqual([])
    expect(breakLine({ x: 0, y: 0 }, { x: Infinity, y: 0 })).toEqual([])
  })

  it('mọi tọa độ hữu hạn; gọi 2 lần giống hệt', () => {
    const f = () =>
      breakLine({ x: 12.5, y: 7 }, { x: 99, y: 31 }, { overshoot: 2 })
    const out = f()
    expect(f()).toEqual(out)
    for (const l of out)
      for (const n of numbersOf(l)) expect(Number.isFinite(n)).toBe(true)
  })
})

describe('zigzagBreak', () => {
  const o = { half: 5, amp: 2, overshoot: 3 }

  it('1 polyline 6 điểm, nét thin mặc định', () => {
    const out = zigzagBreak({ x: 0, y: 0 }, { x: 100, y: 0 }, o)
    expect(out).toHaveLength(1)
    expect(out[0].kind).toBe('polyline')
    expect(out[0].pts).toHaveLength(6)
    expect(out[0].weight).toBe('thin')
    expect(
      zigzagBreak(
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { ...o, weight: 'medium' },
      )[0].weight,
    ).toBe('medium')
  })

  it('đầu / cuối kéo quá a / b đúng overshoot', () => {
    const [pl] = zigzagBreak({ x: 10, y: 20 }, { x: 110, y: 20 }, o)
    expect(pl.pts[0]).toEqual({ x: 7, y: 20 })
    expect(pl.pts[5]).toEqual({ x: 113, y: 20 })
  })

  it('không có overshoot thì chạy đúng từ a đến b', () => {
    const [pl] = zigzagBreak(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      {
        half: 5,
        amp: 2,
      },
    )
    expect(pl.pts[0]).toEqual({ x: 0, y: 0 })
    expect(pl.pts[5]).toEqual({ x: 100, y: 0 })
  })

  it('bump ở giữa mặc định: xuống rồi lên, đối xứng qua giữa', () => {
    const [pl] = zigzagBreak({ x: 0, y: 0 }, { x: 100, y: 0 }, o)
    const [, p1, p2, p3, p4] = pl.pts
    expect(p1).toEqual({ x: 45, y: 0 })
    expect(p2).toEqual({ x: 45, y: 2 }) // xuống giấy (y tăng)
    expect(p3).toEqual({ x: 55, y: -2 })
    expect(p4).toEqual({ x: 55, y: 0 })
    expect((p1.x + p4.x) / 2).toBe(50)
  })

  it('at dời bump theo tỷ lệ chiều dài', () => {
    const [pl] = zigzagBreak(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      {
        ...o,
        at: 0.25,
      },
    )
    expect(pl.pts[1].x).toBe(20)
    expect(pl.pts[4].x).toBe(30)
  })

  it('đường dọc: bump lệch sang trái (pháp tuyến xoay theo đường)', () => {
    const [pl] = zigzagBreak({ x: 50, y: 0 }, { x: 50, y: 100 }, o)
    expect(pl.pts[0].y).toBeCloseTo(-3, 9)
    expect(pl.pts[2].x).toBeCloseTo(48, 9)
    expect(pl.pts[3].x).toBeCloseTo(52, 9)
    for (const q of numbersOf(pl)) expect(Number.isFinite(q)).toBe(true)
  })

  it('d = 0 hoặc điểm không hữu hạn trả []', () => {
    expect(zigzagBreak({ x: 5, y: 5 }, { x: 5, y: 5 }, o)).toEqual([])
    expect(zigzagBreak({ x: 0, y: 0 }, { x: NaN, y: 0 }, o)).toEqual([])
  })
})
