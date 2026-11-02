import { describe, expect, it } from 'vitest'

import { UNDERLINE_DROP } from '#/drawing/prims'
import { DOOR_ARROW, doorArrow } from '#/drawing/primitives/door-arrow'
import { measure } from '#/drawing/text-metrics'
import type { LinePrim, PolylinePrim, Prim, Pt } from '#/drawing/types'
import { numbersOf, textSpan, texts } from '#/tests/drawing/helpers'

const TIP: Pt = { x: 200, y: 100 }
const W = DOOR_ARROW.width
const H = DOOR_ARROW.height
const SHIFT = DOOR_ARROW.shift

const trisOf = (ps: Array<Prim>) =>
  ps.filter((p): p is PolylinePrim => p.kind === 'polyline')
const linesOf = (ps: Array<Prim>) =>
  ps.filter((p): p is LinePrim => p.kind === 'line')

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)
const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

describe('DOOR_ARROW', () => {
  it('kích thước mặc định đo từ bản vẽ mẫu', () => {
    expect(DOOR_ARROW.width).toBe(22.5)
    expect(DOOR_ARROW.height).toBe(7.3)
    expect(DOOR_ARROW.shift).toBe(2.5)
    expect(DOOR_ARROW.label).toBe('Hướng cửa vào thang máy')
    expect(DOOR_ARROW.size).toBe(8)
  })
})

describe('doorArrow: hai tam giác', () => {
  const out = doorArrow(TIP)
  const [t1, t2] = trisOf(out)

  it('đúng 2 tam giác kín, nét thin, không tô đặc', () => {
    expect(trisOf(out)).toHaveLength(2)
    for (const t of [t1, t2]) {
      expect(t.closed).toBe(true)
      expect(t.pts).toHaveLength(3)
      expect(t.weight).toBe('thin')
      expect(t.fill ?? 'none').toBe('none')
    }
  })

  it('hai tam giác bằng nhau (cùng ba cạnh)', () => {
    const edges = (t: PolylinePrim) => [
      dist(t.pts[0], t.pts[1]),
      dist(t.pts[1], t.pts[2]),
      dist(t.pts[2], t.pts[0]),
    ]
    const e1 = edges(t1)
    const e2 = edges(t2)
    e1.forEach((e, i) => expect(e2[i]).toBeCloseTo(e, 9))
  })

  it('mặc định chỉ lên: đỉnh tam giác đầu đúng tại tip, đáy rộng `width` ở dưới `height`', () => {
    expect(t1.pts[0]).toEqual(TIP)
    expect(dist(t1.pts[1], t1.pts[2])).toBeCloseTo(W, 9)
    expect(t1.pts[1].y).toBeCloseTo(TIP.y + H, 9)
    expect(t1.pts[2].y).toBeCloseTo(TIP.y + H, 9)
    expect(mid(t1.pts[1], t1.pts[2]).x).toBeCloseTo(TIP.x, 9)
  })

  it('tam giác sau dời `shift` ra xa đỉnh, giữ nguyên hình', () => {
    t2.pts.forEach((p, i) => {
      expect(p.x).toBeCloseTo(t1.pts[i].x, 9)
      expect(p.y).toBeCloseTo(t1.pts[i].y + SHIFT, 9)
    })
  })

  it('width / height / shift tùy chỉnh', () => {
    const [a, b] = trisOf(doorArrow(TIP, { width: 10, height: 4, shift: 1 }))
    expect(dist(a.pts[1], a.pts[2])).toBeCloseTo(10, 9)
    expect(a.pts[1].y).toBeCloseTo(TIP.y + 4, 9)
    expect(b.pts[0].y).toBeCloseTo(TIP.y + 1, 9)
  })
})

describe('doorArrow: nhãn', () => {
  it('mặc định "Hướng cửa vào thang máy", canh giữa dưới mũi tên, có gạch chân', () => {
    const out = doorArrow(TIP)
    const [t] = texts(out)
    expect(t.text).toBe('Hướng cửa vào thang máy')
    expect(t.anchor).toBe('middle')
    expect(t.x).toBe(TIP.x)
    expect(t.size).toBe(DOOR_ARROW.size)
    // Dưới điểm thấp nhất của mũi tên (đáy tam giác sau) một đoạn labelDrop × size.
    const bottom = TIP.y + SHIFT + H
    expect(t.y).toBeCloseTo(bottom + DOOR_ARROW.labelDrop * DOOR_ARROW.size, 9)
    const u = linesOf(out)
    expect(u).toHaveLength(1)
    expect(u[0].a.y).toBeCloseTo(t.y + UNDERLINE_DROP * t.size, 9)
    expect(u[0].b.y).toBe(u[0].a.y)
    const [lo, hi] = textSpan(t)
    expect(Math.min(u[0].a.x, u[0].b.x)).toBeCloseTo(lo, 9)
    expect(Math.max(u[0].a.x, u[0].b.x)).toBeCloseTo(hi, 9)
    expect(hi - lo).toBeCloseTo(measure(DOOR_ARROW.label, DOOR_ARROW.size), 9)
  })

  it('label: null → không chữ, không gạch chân', () => {
    const out = doorArrow(TIP, { label: null })
    expect(texts(out)).toHaveLength(0)
    expect(linesOf(out)).toHaveLength(0)
    expect(out).toHaveLength(2)
  })

  it('label rỗng cũng không vẽ gì', () => {
    expect(doorArrow(TIP, { label: '' })).toHaveLength(2)
  })

  it('label và size tùy chỉnh', () => {
    const out = doorArrow(TIP, { label: 'Cửa', size: 5 })
    const [t] = texts(out)
    expect(t.text).toBe('Cửa')
    expect(t.size).toBe(5)
    expect(t.y).toBeCloseTo(TIP.y + SHIFT + H + DOOR_ARROW.labelDrop * 5, 9)
  })
})

describe('doorArrow: rotate', () => {
  // Hướng đáy so với đỉnh khi mũi tên chỉ: 0 lên, 90 phải, 180 xuống, 270 trái.
  const BASE_DIR: Record<0 | 90 | 180 | 270, Pt> = {
    0: { x: 0, y: 1 },
    90: { x: -1, y: 0 },
    180: { x: 0, y: -1 },
    270: { x: 1, y: 0 },
  }

  it.each([0, 90, 180, 270] as const)(
    'rotate %s: đỉnh vẫn tại tip, đáy lùi `height` về phía ngược hướng mũi tên',
    (r) => {
      const [t1] = trisOf(doorArrow(TIP, { rotate: r }))
      expect(t1.pts[0]).toEqual(TIP)
      const b = mid(t1.pts[1], t1.pts[2])
      const d = BASE_DIR[r]
      expect(b.x).toBeCloseTo(TIP.x + d.x * H, 9)
      expect(b.y).toBeCloseTo(TIP.y + d.y * H, 9)
      expect(dist(t1.pts[1], t1.pts[2])).toBeCloseTo(W, 9)
    },
  )

  it.each([0, 90, 180, 270] as const)(
    'rotate %s: tam giác sau dời `shift` dọc trục mũi tên, ra xa đỉnh',
    (r) => {
      const [t1, t2] = trisOf(doorArrow(TIP, { rotate: r }))
      const d = BASE_DIR[r]
      t2.pts.forEach((p, i) => {
        expect(p.x).toBeCloseTo(t1.pts[i].x + d.x * SHIFT, 9)
        expect(p.y).toBeCloseTo(t1.pts[i].y + d.y * SHIFT, 9)
      })
    },
  )

  it.each([0, 90, 180, 270] as const)(
    'rotate %s: nhãn nằm dưới mọi đỉnh, canh giữa theo thân mũi tên',
    (r) => {
      const out = doorArrow(TIP, { rotate: r })
      const tris = trisOf(out)
      const lowest = Math.max(...tris.flatMap((t) => t.pts.map((p) => p.y)))
      const [label] = texts(out)
      expect(label.y).toBeGreaterThan(lowest)
      expect(label.y).toBeCloseTo(
        lowest + DOOR_ARROW.labelDrop * DOOR_ARROW.size,
        9,
      )
      // canh giữa theo tâm hộp bao của hai tam giác (trùng tip.x khi chỉ lên/xuống)
      const xs = tris.flatMap((t) => t.pts.map((p) => p.x))
      expect(label.x).toBeCloseTo((Math.min(...xs) + Math.max(...xs)) / 2, 9)
      if (r === 0 || r === 180) expect(label.x).toBeCloseTo(TIP.x, 9)
      else expect(label.x).not.toBeCloseTo(TIP.x, 3)
    },
  )

  it('rotate 90: mũi tên chỉ sang phải — đáy nằm bên trái tip', () => {
    const [t] = trisOf(doorArrow(TIP, { rotate: 90, label: null }))
    expect(t.pts[1].x).toBeLessThan(TIP.x)
    expect(t.pts[2].x).toBeLessThan(TIP.x)
  })

  it('rotate 180: mũi tên chỉ xuống — đáy nằm phía trên tip', () => {
    const [t] = trisOf(doorArrow(TIP, { rotate: 180, label: null }))
    expect(t.pts[1].y).toBeLessThan(TIP.y)
  })
})

describe('doorArrow: ổn định', () => {
  it.each([0, 90, 180, 270] as const)(
    'rotate %s: mọi tọa độ hữu hạn, gọi 2 lần giống hệt',
    (r) => {
      const a = doorArrow(TIP, { rotate: r })
      expect(doorArrow(TIP, { rotate: r })).toEqual(a)
      for (const p of a)
        for (const n of numbersOf(p)) expect(Number.isFinite(n)).toBe(true)
    },
  )
})
