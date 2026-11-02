import { describe, expect, it } from 'vitest'

import { BREAK_GAP, breakLine } from '#/drawing/primitives/break-line'
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
