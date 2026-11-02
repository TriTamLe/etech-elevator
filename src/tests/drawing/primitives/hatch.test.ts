import { describe, expect, it } from 'vitest'

import {
  MAX_HATCH_SEGS,
  MIN_HATCH_GAP,
  hatch,
} from '#/drawing/primitives/hatch'
import { HATCH_NAMES } from '#/drawing/primitives/hatch-patterns'
import type { HatchName } from '#/drawing/primitives/hatch-patterns'
import { toSheet, view } from '#/drawing/primitives/view'
import type { View } from '#/drawing/primitives/view'
import type { LinesPrim, PolylinePrim, Prim, Pt } from '#/drawing/types'
import { numbersOf } from '#/tests/drawing/helpers'

type P = [number, number]
type Stroke = [P, P]

/** Pattern scale (AutoCAD) dùng trong bản vẽ mẫu cho từng mẫu. */
const SCALE: Record<HatchName, number> = {
  'AR-CONC': 10,
  'AR-BRSTD': 20,
  ANSI31: 100,
  ANSI32: 100,
  ANSI34: 50,
  BRSTONE: 80,
  'AR-B816C': 5,
}

const rectRing = (x: number, y: number, w: number, h: number): Array<Pt> => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
]

const linesOf = (ps: Array<Prim>) =>
  ps.find((p): p is LinesPrim => p.kind === 'lines')
const polylinesOf = (ps: Array<Prim>) =>
  ps.filter((p): p is PolylinePrim => p.kind === 'polyline')

function strokesOf(ps: Array<Prim>): Array<Stroke> {
  const l = linesOf(ps)
  if (!l) return []
  const out: Array<Stroke> = []
  for (let i = 0; i + 3 < l.segs.length; i += 4)
    out.push([
      [l.segs[i], l.segs[i + 1]],
      [l.segs[i + 2], l.segs[i + 3]],
    ])
  return out
}

const strokeLen = ([a, b]: Stroke) => Math.hypot(b[0] - a[0], b[1] - a[1])

// --- hình học thử -----------------------------------------------------------

const TOL = 1e-6

function distToSeg(p: P, a: P, b: P): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const l2 = dx * dx + dy * dy
  const t =
    l2 === 0
      ? 0
      : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

function inPolygon(p: P, ring: Array<P>): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (
      yi > p[1] !== yj > p[1] &&
      p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi
    )
      inside = !inside
  }
  return inside
}

/** Điểm thuộc vùng (chẵn–lẻ); điểm nằm trên cạnh (sai số TOL) tính là trong. */
function inRegion(p: P, rings: Array<Array<P>>, tol = TOL): boolean {
  for (const r of rings)
    for (let i = 0; i < r.length; i++)
      if (distToSeg(p, r[i], r[(i + 1) % r.length]) <= tol) return true
  return rings.filter((r) => inPolygon(p, r)).length % 2 === 1
}

/** Điểm nằm hẳn trong vùng `ring` (không tính biên). */
function strictlyInside(p: P, ring: Array<P>, tol = TOL): boolean {
  for (let i = 0; i < ring.length; i++)
    if (distToSeg(p, ring[i], ring[(i + 1) % ring.length]) <= tol) return false
  return inPolygon(p, ring)
}

const sheetRing = (v: View, ring: Array<Pt>): Array<P> =>
  ring.map((q) => {
    const s = toSheet(v, q)
    return [s.x, s.y]
  })

const near = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol

/** Các giá trị duy nhất (sai số tol), đã sắp xếp tăng. */
function unique(xs: Array<number>, tol = 1e-6): Array<number> {
  const s = [...xs].sort((a, b) => a - b)
  const out: Array<number> = []
  for (const x of s)
    if (!out.length || x - out[out.length - 1] > tol) out.push(x)
  return out
}

const horizontal = (ss: Array<Stroke>) =>
  ss.filter(([a, b]) => near(a[1], b[1], 1e-9) && !near(a[0], b[0], 1e-9))
const vertical = (ss: Array<Stroke>) =>
  ss.filter(([a, b]) => near(a[0], b[0], 1e-9) && !near(a[1], b[1], 1e-9))

// --- cảnh thử ---------------------------------------------------------------

const V20 = view(20, { x: 50, y: 40 })
const V50 = view(50, { x: 20, y: 30 })

/** Chữ L có hai lỗ: tam giác ở cánh trái và chữ nhật ở cánh phải. */
const L_SHAPE: Array<Pt> = [
  { x: 0, y: 0 },
  { x: 3000, y: 0 },
  { x: 3000, y: 1200 },
  { x: 1500, y: 1200 },
  { x: 1500, y: 2500 },
  { x: 0, y: 2500 },
]
const HOLE_TRI: Array<Pt> = [
  { x: 300, y: 300 },
  { x: 1200, y: 400 },
  { x: 400, y: 1500 },
]
const HOLE_RECT = rectRing(1800, 200, 900, 700)

describe('hatch: cấu trúc kết quả', () => {
  const ring = rectRing(0, 0, 1000, 500)

  it('không viền: đúng 1 prim `lines`, segs phẳng x1,y1,x2,y2 (bội của 4)', () => {
    const out = hatch(V20, [ring], 'AR-BRSTD', { scale: 20 })
    expect(out).toHaveLength(1)
    expect(out[0].kind).toBe('lines')
    const l = out[0] as LinesPrim
    expect(l.segs.length).toBeGreaterThan(0)
    expect(l.segs.length % 4).toBe(0)
  })

  it('có outline: `lines` đứng đầu, sau đó mỗi vòng một polyline đóng đúng nét outline', () => {
    const hole = rectRing(200, 100, 300, 200)
    const out = hatch(V20, [ring, hole], 'ANSI31', {
      scale: 100,
      outline: 'medium',
    })
    expect(out[0].kind).toBe('lines')
    const polys = polylinesOf(out)
    expect(polys).toHaveLength(2)
    for (const p of polys) {
      expect(p.closed).toBe(true)
      expect(p.weight).toBe('medium')
    }
    expect(polys[0].pts).toEqual(ring.map((q) => toSheet(V20, q)))
    expect(polys[1].pts).toEqual(hole.map((q) => toSheet(V20, q)))
  })

  it('mặc định không vẽ viền', () => {
    const out = hatch(V20, [ring], 'ANSI31', { scale: 100 })
    expect(polylinesOf(out)).toHaveLength(0)
  })

  it('nét mặc định: AR-CONC medium, mẫu khác thin; `weight` ghi đè', () => {
    expect(linesOf(hatch(V20, [ring], 'AR-CONC', { scale: 20 }))?.weight).toBe(
      'medium',
    )
    for (const name of HATCH_NAMES.filter((n) => n !== 'AR-CONC'))
      expect(
        linesOf(hatch(V50, [ring], name, { scale: SCALE[name] }))?.weight,
      ).toBe('thin')
    expect(
      linesOf(hatch(V20, [ring], 'AR-CONC', { scale: 20, weight: 'thick' }))
        ?.weight,
    ).toBe('thick')
    expect(
      linesOf(hatch(V20, [ring], 'ANSI31', { scale: 100, weight: 'medium' }))
        ?.weight,
    ).toBe('medium')
  })

  it('vùng quá nhỏ không có nét nào nhưng có outline: chỉ còn viền, không có `lines`', () => {
    // 1 × 1 mm thật = 0,05 mm giấy, lọt giữa các đường của mẫu.
    const tiny = rectRing(1, 1, 1, 1)
    const out = hatch(V20, [tiny], 'AR-BRSTD', { scale: 20, outline: 'thin' })
    expect(linesOf(out)).toBeUndefined()
    expect(polylinesOf(out)).toHaveLength(1)
  })
})

describe('hatch: vùng/tham số không hợp lệ', () => {
  const ring = rectRing(0, 0, 1000, 500)
  const o = { scale: 20 }

  it('không có vòng nào → []', () => {
    expect(hatch(V20, [], 'AR-BRSTD', o)).toEqual([])
  })

  it('vòng dưới 3 điểm → []', () => {
    expect(hatch(V20, [ring.slice(0, 2)], 'AR-BRSTD', o)).toEqual([])
  })

  it('vòng có NaN / Infinity → []', () => {
    const bad = ring.map((p, i) => (i === 2 ? { x: NaN, y: p.y } : p))
    expect(hatch(V20, [bad], 'AR-BRSTD', o)).toEqual([])
    const inf = ring.map((p, i) => (i === 1 ? { x: p.x, y: Infinity } : p))
    expect(hatch(V20, [inf], 'AR-BRSTD', o)).toEqual([])
  })

  it('vòng hỏng bị bỏ qua, vòng tốt vẫn được hatch', () => {
    const bad = rectRing(NaN, 0, 10, 10)
    expect(hatch(V20, [ring, bad], 'ANSI31', { scale: 100 })).toEqual(
      hatch(V20, [ring], 'ANSI31', { scale: 100 }),
    )
  })

  it.each([0, -5, NaN, Infinity])(
    'scale = %s: không có nét hatch; không xin viền → [], có xin viền → vẫn còn viền',
    (s) => {
      expect(hatch(V20, [ring], 'AR-BRSTD', { scale: s })).toEqual([])
      const out = hatch(V20, [ring], 'AR-BRSTD', {
        scale: s,
        outline: 'thin',
      })
      expect(linesOf(out)).toBeUndefined()
      expect(out).toHaveLength(1)
      const [poly] = polylinesOf(out)
      expect(poly.closed).toBe(true)
      expect(poly.weight).toBe('thin')
      expect(poly.pts).toEqual(ring.map((q) => toSheet(V20, q)))
    },
  )

  it('view.scale không hợp lệ → [] kể cả khi xin viền; vùng rỗng → []', () => {
    const bad = { ...V20, scale: 0 }
    expect(
      hatch(bad, [ring], 'AR-BRSTD', { scale: 20, outline: 'thin' }),
    ).toEqual([])
    expect(hatch(V20, [], 'AR-BRSTD', { scale: 20, outline: 'thin' })).toEqual(
      [],
    )
  })

  it('view.scale ≤ 0 hoặc NaN → []', () => {
    expect(hatch({ ...V20, scale: 0 }, [ring], 'AR-BRSTD', o)).toEqual([])
    expect(hatch({ ...V20, scale: NaN }, [ring], 'AR-BRSTD', o)).toEqual([])
  })

  it('origin / angle không hợp lệ rơi về mặc định, không ném lỗi', () => {
    const base = hatch(V20, [ring], 'ANSI31', { scale: 100 })
    const weird = hatch(V20, [ring], 'ANSI31', {
      scale: 100,
      angle: NaN,
      origin: { x: NaN, y: 3 },
    })
    expect(weird).toEqual(base)
  })
})

describe.each(HATCH_NAMES)('hatch %s: mọi nét nằm trong vùng', (name) => {
  const rings = [L_SHAPE, HOLE_TRI, HOLE_RECT]
  const sheet = rings.map((r) => sheetRing(V50, r))

  it.each([
    ['không xoay', {}],
    ['xoay 30° + gốc dời', { angle: 30, origin: { x: 137, y: -240 } }],
  ])(
    '%s: các điểm dọc nét đều thuộc vùng (chẵn–lẻ, biên tính là trong)',
    (_t, extra) => {
      const out = hatch(V50, rings, name, { scale: SCALE[name], ...extra })
      const strokes = strokesOf(out)
      expect(strokes.length).toBeGreaterThan(0)
      for (const [a, b] of strokes)
        for (const t of [0, 0.25, 0.5, 0.75, 1]) {
          const p: P = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
          expect(inRegion(p, sheet)).toBe(true)
        }
    },
  )

  it('trung điểm mỗi nét không rơi hẳn vào lỗ', () => {
    const strokes = strokesOf(hatch(V50, rings, name, { scale: SCALE[name] }))
    for (const [a, b] of strokes) {
      const m: P = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
      expect(strictlyInside(m, sheet[1])).toBe(false)
      expect(strictlyInside(m, sheet[2])).toBe(false)
    }
  })

  it('có nét ở cả hai cánh chữ L (không bỏ sót vùng)', () => {
    const strokes = strokesOf(hatch(V50, rings, name, { scale: SCALE[name] }))
    const left = sheetRing(V50, rectRing(0, 1300, 1500, 1200))
    const right = sheetRing(V50, rectRing(1500, 0, 1500, 1200))
    const touches = (box: Array<P>) =>
      strokes.some(([a, b]) =>
        inRegion([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], [box]),
      )
    expect(touches(left)).toBe(true)
    expect(touches(right)).toBe(true)
  })

  it('mọi tọa độ hữu hạn; gọi 2 lần ra kết quả giống hệt', () => {
    const f = () =>
      hatch(V50, rings, name, { scale: SCALE[name], outline: 'thin' })
    const a = f()
    expect(f()).toEqual(a)
    for (const p of a)
      for (const n of numbersOf(p)) expect(Number.isFinite(n)).toBe(true)
  })

  it('ít hơn MAX_HATCH_SEGS nét', () => {
    const l = linesOf(hatch(V50, rings, name, { scale: SCALE[name] }))
    expect(l!.segs.length / 4).toBeLessThanOrEqual(MAX_HATCH_SEGS)
  })
})

describe('hatch: lỗ (chẵn–lẻ)', () => {
  it('lỗ chữ nhật: không nét nào cắt qua phần lỗ', () => {
    const outer = rectRing(0, 0, 2000, 1000)
    const hole = rectRing(500, 250, 1000, 500)
    const out = hatch(V20, [outer, hole], 'AR-BRSTD', { scale: 20 })
    const holeSheet = sheetRing(V20, hole)
    const strokes = strokesOf(out)
    expect(strokes.length).toBeGreaterThan(0)
    for (const [a, b] of strokes)
      for (const t of [0.1, 0.3, 0.5, 0.7, 0.9]) {
        const p: P = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
        expect(strictlyInside(p, holeSheet)).toBe(false)
      }
  })

  it('có lỗ thì ít nét hơn không lỗ, tổng chiều dài ngang giảm đúng bằng phần lỗ', () => {
    const outer = rectRing(0, 0, 2000, 1000)
    const hole = rectRing(500, 250, 1000, 500)
    const full = horizontal(
      strokesOf(hatch(V20, [outer], 'AR-BRSTD', { scale: 20 })),
    )
    const holed = horizontal(
      strokesOf(hatch(V20, [outer, hole], 'AR-BRSTD', { scale: 20 })),
    )
    const sum = (ss: Array<Stroke>) => ss.reduce((s, x) => s + strokeLen(x), 0)
    // Phần lỗ trên giấy: 50 mm rộng; mỗi đường ngang đi qua lỗ mất 50 mm.
    const crossing = unique(
      full
        .map(([a]) => a[1])
        .filter(
          (y) =>
            y > toSheet(V20, { x: 0, y: 250 }).y &&
            y < toSheet(V20, { x: 0, y: 750 }).y,
        ),
    ).length
    expect(sum(full) - sum(holed)).toBeCloseTo(crossing * 50, 6)
  })

  it('lỗ ngoài vòng ngoài (không lồng nhau) vẫn tính chẵn–lẻ: hai vòng rời nhau đều được hatch', () => {
    const a = rectRing(0, 0, 800, 800)
    const b = rectRing(2000, 0, 800, 800)
    const strokes = strokesOf(hatch(V20, [a, b], 'ANSI31', { scale: 100 }))
    const sa = sheetRing(V20, a)
    const sb = sheetRing(V20, b)
    expect(strokes.some(([p]) => inRegion(p, [sa]))).toBe(true)
    expect(strokes.some(([p]) => inRegion(p, [sb]))).toBe(true)
  })
})

describe('hatch: khoảng cách đường theo AutoCAD', () => {
  const ring = rectRing(333, 217, 4200, 1900)

  it('AR-BRSTD scale 20 ở 1:20: các nét ngang cách nhau 2,667 mm giấy', () => {
    const ys = unique(
      horizontal(strokesOf(hatch(V20, [ring], 'AR-BRSTD', { scale: 20 }))).map(
        ([a]) => a[1],
      ),
    )
    expect(ys.length).toBeGreaterThan(5)
    for (let i = 1; i < ys.length; i++)
      expect(ys[i] - ys[i - 1]).toBeCloseTo(2.667, 6)
  })

  it('AR-BRSTD scale 20 ở 1:50: 2,667 × 20 / 50 = 1,0668 mm giấy', () => {
    const ys = unique(
      horizontal(strokesOf(hatch(V50, [ring], 'AR-BRSTD', { scale: 20 }))).map(
        ([a]) => a[1],
      ),
    )
    for (let i = 1; i < ys.length; i++)
      expect(ys[i] - ys[i - 1]).toBeCloseTo((2.667 * 20) / 50, 6)
  })

  it('gốc mẫu ở (0, 0) thật: nét ngang rơi đúng lưới 2,667 tính từ gốc trên giấy', () => {
    const ys = horizontal(
      strokesOf(hatch(V20, [ring], 'AR-BRSTD', { scale: 20 })),
    ).map(([a]) => a[1])
    for (const y of ys) {
      const k = (V20.origin.y - y) / 2.667
      expect(Math.abs(k - Math.round(k))).toBeLessThan(1e-6)
    }
  })

  it('đổi origin của view chỉ tịnh tiến nét, không đổi mẫu', () => {
    const a = linesOf(
      hatch(view(20, { x: 0, y: 0 }), [ring], 'AR-CONC', { scale: 20 }),
    )!
    const b = linesOf(
      hatch(view(20, { x: 100, y: 50 }), [ring], 'AR-CONC', { scale: 20 }),
    )!
    expect(b.segs).toHaveLength(a.segs.length)
    for (let i = 0; i < a.segs.length; i += 2) {
      expect(b.segs[i] - a.segs[i]).toBeCloseTo(100, 6)
      expect(b.segs[i + 1] - a.segs[i + 1]).toBeCloseTo(50, 6)
    }
  })

  it('opts.origin dời gốc mẫu đến điểm thật đó', () => {
    const o = { x: 0, y: 130 } // thật
    const ys = horizontal(
      strokesOf(hatch(V20, [ring], 'AR-BRSTD', { scale: 20, origin: o })),
    ).map(([a]) => a[1])
    const oy = toSheet(V20, o).y
    expect(ys.length).toBeGreaterThan(0)
    for (const y of ys) {
      const k = (oy - y) / 2.667
      expect(Math.abs(k - Math.round(k))).toBeLessThan(1e-6)
    }
  })

  it('AR-BRSTD: nét dọc dài 2,667, cách nhau 4 mm giấy, so le 2,667 giữa hai cột kề nhau', () => {
    const strokes = vertical(
      strokesOf(hatch(V20, [ring], 'AR-BRSTD', { scale: 20 })),
    ).filter((s) => near(strokeLen(s), 2.667, 1e-6)) // bỏ nét bị cắt ở biên
    const xs = unique(strokes.map(([a]) => a[0]))
    expect(xs.length).toBeGreaterThan(5)
    for (let i = 1; i < xs.length; i++)
      expect(xs[i] - xs[i - 1]).toBeCloseTo(4, 6)
    // Vị trí đầu nét theo chu kỳ 5,334 (nét 2,667 + hở 2,667).
    const phase = (x: number) => {
      const ymin = Math.min(
        ...strokes
          .filter(([a]) => near(a[0], x))
          .map(([a, b]) => Math.min(a[1], b[1])),
      )
      return ((ymin % 5.334) + 5.334) % 5.334
    }
    for (let i = 1; i < xs.length; i++) {
      const d = (((phase(xs[i]) - phase(xs[i - 1])) % 5.334) + 5.334) % 5.334
      expect(near(d, 2.667, 1e-4) || near(d, 5.334 - 2.667, 1e-4)).toBe(true)
    }
  })

  it('ANSI31 nét 45° quay lên bên phải (y giấy hướng xuống), cách 0,125 × k', () => {
    const v = view(20, { x: 0, y: 0 })
    const strokes = strokesOf(hatch(v, [ring], 'ANSI31', { scale: 100 })) // k = 5
    expect(strokes.length).toBeGreaterThan(5)
    for (const [a, b] of strokes) {
      const dx = b[0] - a[0]
      const dy = b[1] - a[1]
      expect(Math.abs(Math.abs(dx) - Math.abs(dy))).toBeLessThan(1e-6)
      expect(dx * dy).toBeLessThan(0) // lên phải/xuống trái
    }
    const c = unique(strokes.map(([a]) => (a[0] + a[1]) * Math.SQRT1_2))
    // pháp tuyến của đường 45° (lên phải) trên giấy y xuống: (1, 1)/√2
    for (let i = 1; i < c.length; i++)
      expect(c[i] - c[i - 1]).toBeCloseTo(0.125 * 5, 6)
  })

  it('angle quay cả mẫu: ANSI31 xoay 90° thành đường nghiêng ngược', () => {
    const v = view(20, { x: 0, y: 0 })
    const strokes = strokesOf(
      hatch(v, [ring], 'ANSI31', { scale: 100, angle: 90 }),
    )
    expect(strokes.length).toBeGreaterThan(5)
    for (const [a, b] of strokes)
      expect((b[0] - a[0]) * (b[1] - a[1])).toBeGreaterThan(0)
  })
})

describe('hatch: ghép hai nửa = cả hình', () => {
  const whole = rectRing(130, 130, 940, 640)
  const left = rectRing(130, 130, 470, 640)
  const right = rectRing(600, 130, 470, 640)

  it.each(['AR-BRSTD', 'ANSI31', 'ANSI32', 'AR-B816C'] as const)(
    '%s: tập y của nét ngang và tổng chiều dài nét khớp',
    (name) => {
      const opts = { scale: SCALE[name] }
      const w = strokesOf(hatch(V20, [whole], name, opts))
      const halves = [
        ...strokesOf(hatch(V20, [left], name, opts)),
        ...strokesOf(hatch(V20, [right], name, opts)),
      ]
      const total = (ss: Array<Stroke>) =>
        ss.reduce((s, x) => s + strokeLen(x), 0)
      expect(total(halves)).toBeCloseTo(total(w), 5)
      const yW = unique(horizontal(w).map(([a]) => a[1]))
      const yH = unique(horizontal(halves).map(([a]) => a[1]))
      expect(yH).toHaveLength(yW.length)
      yW.forEach((y, i) => expect(yH[i]).toBeCloseTo(y, 6))
      const hl = (ss: Array<Stroke>) =>
        horizontal(ss).reduce((s, x) => s + strokeLen(x), 0)
      expect(hl(halves)).toBeCloseTo(hl(w), 5)
    },
  )

  it('AR-BRSTD: tổng chiều dài nét ngang đúng bằng (số đường × bề rộng)', () => {
    const w = horizontal(
      strokesOf(hatch(V20, [whole], 'AR-BRSTD', { scale: 20 })),
    )
    const ys = unique(w.map(([a]) => a[1]))
    const sum = w.reduce((s, x) => s + strokeLen(x), 0)
    expect(sum).toBeCloseTo(ys.length * (940 / 20), 6)
  })
})

describe('hatch: giới hạn số nét và khoảng cách tối thiểu', () => {
  it('MAX_HATCH_SEGS = 20000, MIN_HATCH_GAP = 0,3', () => {
    expect(MAX_HATCH_SEGS).toBe(20000)
    expect(MIN_HATCH_GAP).toBe(0.3)
  })

  it('vùng lớn 2110 × 17000, AR-CONC scale 10 ở 1:75: không vượt MAX_HATCH_SEGS, chạy nhanh', () => {
    const v = view(75, { x: 50, y: 40 })
    const t0 = performance.now()
    const out = hatch(v, [rectRing(0, 0, 2110, 17000)], 'AR-CONC', {
      scale: 10,
    })
    const ms = performance.now() - t0
    const l = linesOf(out)!
    expect(l.segs.length / 4).toBeGreaterThan(0)
    expect(l.segs.length / 4).toBeLessThanOrEqual(MAX_HATCH_SEGS)
    expect(ms).toBeLessThan(500)
  })

  it('vùng khổng lồ + mẫu liền (ANSI31): tự nhân đôi scale cho đến khi ≤ MAX_HATCH_SEGS, vẫn có nét', () => {
    const out = hatch(
      view(10, { x: 0, y: 0 }),
      [rectRing(0, 0, 400000, 400000)],
      'ANSI31',
      { scale: 100 },
    )
    const l = linesOf(out)
    expect(l).toBeDefined()
    expect(l!.segs.length / 4).toBeGreaterThan(0)
    expect(l!.segs.length / 4).toBeLessThanOrEqual(MAX_HATCH_SEGS)
  })

  it('vùng khổng lồ + AR-CONC: hoặc ≤ MAX_HATCH_SEGS hoặc bỏ hẳn (không ném lỗi); xin viền thì viền vẫn còn', () => {
    const v = view(10, { x: 0, y: 0 })
    const out = hatch(v, [rectRing(0, 0, 100000, 100000)], 'AR-CONC', {
      scale: 10,
      outline: 'thin',
    })
    const l = linesOf(out)
    if (l) expect(l.segs.length / 4).toBeLessThanOrEqual(MAX_HATCH_SEGS)
    expect(polylinesOf(out)).toHaveLength(1)
    for (const p of out)
      for (const n of numbersOf(p)) expect(Number.isFinite(n)).toBe(true)
  })

  it('ANSI31 scale 100 ở 1:75: khoảng cách giữa các đường trên giấy ≥ MIN_HATCH_GAP', () => {
    const v = view(75, { x: 0, y: 0 })
    const strokes = strokesOf(
      hatch(v, [rectRing(0, 0, 6000, 4000)], 'ANSI31', { scale: 100 }),
    )
    expect(strokes.length).toBeGreaterThan(5)
    const c = unique(
      strokes.map(([a]) => (a[0] + a[1]) * Math.SQRT1_2),
      1e-7,
    )
    for (let i = 1; i < c.length; i++)
      expect(c[i] - c[i - 1]).toBeGreaterThanOrEqual(MIN_HATCH_GAP - 1e-6)
  })

  it('ANSI31 scale 100 ở 1:75 chỉ nhân đôi đúng một lần: 0,125 × 100 / 75 × 2', () => {
    const v = view(75, { x: 0, y: 0 })
    const strokes = strokesOf(
      hatch(v, [rectRing(0, 0, 6000, 4000)], 'ANSI31', { scale: 100 }),
    )
    const c = unique(
      strokes.map(([a]) => (a[0] + a[1]) * Math.SQRT1_2),
      1e-7,
    )
    for (let i = 1; i < c.length; i++)
      expect(c[i] - c[i - 1]).toBeCloseTo(((0.125 * 100) / 75) * 2, 6)
  })

  it('đủ thưa thì giữ nguyên: ANSI31 scale 100 ở 1:20 vẫn là 0,625 mm', () => {
    const v = view(20, { x: 0, y: 0 })
    const strokes = strokesOf(
      hatch(v, [rectRing(0, 0, 3000, 2000)], 'ANSI31', { scale: 100 }),
    )
    const c = unique(
      strokes.map(([a]) => (a[0] + a[1]) * Math.SQRT1_2),
      1e-7,
    )
    for (let i = 1; i < c.length; i++)
      expect(c[i] - c[i - 1]).toBeCloseTo(0.625, 6)
  })

  it('bản vẽ rất nhỏ (ANSI31 scale 1 ở 1:200) vẫn giữ khoảng cách ≥ MIN_HATCH_GAP', () => {
    const v = view(200, { x: 0, y: 0 })
    const strokes = strokesOf(
      hatch(v, [rectRing(0, 0, 20000, 10000)], 'ANSI31', { scale: 1 }),
    )
    expect(strokes.length).toBeGreaterThan(0)
    const c = unique(
      strokes.map(([a]) => (a[0] + a[1]) * Math.SQRT1_2),
      1e-7,
    )
    for (let i = 1; i < c.length; i++)
      expect(c[i] - c[i - 1]).toBeGreaterThanOrEqual(MIN_HATCH_GAP - 1e-6)
  })

  /** Khoảng cách nhỏ nhất (mm giấy) giữa mọi cặp nét song song, mọi họ đường gộp lại. */
  function minParallelGap(ss: Array<Stroke>): number {
    const groups = new Map<string, Array<number>>()
    for (const [a, b] of ss) {
      let dx = b[0] - a[0]
      let dy = b[1] - a[1]
      const d = Math.hypot(dx, dy)
      if (d < 1e-6) continue // chấm (nét đứt có đoạn dài 0)
      dx /= d
      dy /= d
      if (dx < -1e-9 || (Math.abs(dx) < 1e-9 && dy < 0)) [dx, dy] = [-dx, -dy]
      const key = `${dx.toFixed(5)},${dy.toFixed(5)}`
      const c = -dy * a[0] + dx * a[1]
      groups.set(key, [...(groups.get(key) ?? []), c])
    }
    let gap = Infinity
    for (const cs of groups.values()) {
      const u = unique(cs, 1e-7)
      for (let i = 1; i < u.length; i++) gap = Math.min(gap, u[i] - u[i - 1])
    }
    return gap
  }

  it.each(['ANSI31', 'ANSI32', 'ANSI34'] as const)(
    '%s ở 1:20 … 1:200: khoảng cách thật giữa mọi đường song song ≥ MIN_HATCH_GAP',
    (name) => {
      for (const n of [20, 50, 75, 100, 200]) {
        const out = hatch(
          view(n, { x: 0, y: 0 }),
          [rectRing(0, 0, 6000, 4000)],
          name,
          { scale: SCALE[name] },
        )
        expect(minParallelGap(strokesOf(out))).toBeGreaterThanOrEqual(
          MIN_HATCH_GAP - 1e-6,
        )
      }
    },
  )

  it('ANSI34 scale 50 ở 1:20 (giống bản vẽ mẫu): 4 đường sát nhau cách 0,125 × 2,5 = 0,3125, không bị nhân đôi', () => {
    const out = hatch(
      view(20, { x: 0, y: 0 }),
      [rectRing(0, 0, 6000, 4000)],
      'ANSI34',
      { scale: 50 },
    )
    // Gốc các họ đường trong mẫu làm tròn 6 chữ số thập phân nên chỉ khớp ~1e-5.
    expect(minParallelGap(strokesOf(out))).toBeCloseTo(0.3125, 4)
  })

  it('AR-BRSTD scale 20 ở 1:200: 2,667 × 0,1 = 0,2667 < 0,3 → nhân đôi thành 0,5334', () => {
    const ys = unique(
      horizontal(
        strokesOf(
          hatch(
            view(200, { x: 0, y: 0 }),
            [rectRing(0, 0, 20000, 10000)],
            'AR-BRSTD',
            {
              scale: 20,
            },
          ),
        ),
      ).map(([a]) => a[1]),
    )
    expect(ys.length).toBeGreaterThan(5)
    for (let i = 1; i < ys.length; i++)
      expect(ys[i] - ys[i - 1]).toBeCloseTo(0.5334, 6)
  })
})

describe('hatch: đỉnh/cạnh nằm đúng trên đường hatch', () => {
  // View 1:20, gốc thật (0, 0) ↔ giấy (50, 100). AR-BRSTD scale 20 → k = 1, đường ngang
  // j = 0 nằm đúng y thật = 0 (giấy y = 100).
  const V = view(20, { x: 50, y: 100 })
  const ON = 100
  const opts = { scale: 20 }

  /** Mọi nét nằm trong vùng, không có nét dài 0 hoặc gần 0. */
  function expectClean(rings: Array<Array<Pt>>) {
    const sheet = rings.map((r) => sheetRing(V, r))
    const strokes = strokesOf(hatch(V, rings, 'AR-BRSTD', opts))
    expect(strokes.length).toBeGreaterThan(0)
    for (const s of strokes) {
      expect(strokeLen(s)).toBeGreaterThan(1e-9)
      for (const t of [0, 0.5, 1]) {
        const p: P = [
          s[0][0] + (s[1][0] - s[0][0]) * t,
          s[0][1] + (s[1][1] - s[0][1]) * t,
        ]
        expect(inRegion(p, sheet)).toBe(true)
      }
    }
    return strokes
  }
  const onLine = (ss: Array<Stroke>) =>
    horizontal(ss).filter(([a]) => near(a[1], ON, 1e-6))

  it('hình thoi có hai đỉnh nằm trên đường ngang j = 0: nét y = 0 chạy suốt đường chéo, đúng một lần', () => {
    const rhombus = [
      { x: 0, y: 0 },
      { x: 1000, y: -1000 },
      { x: 2000, y: 0 },
      { x: 1000, y: 1000 },
    ]
    const strokes = expectClean([rhombus])
    const total = onLine(strokes).reduce((s, x) => s + strokeLen(x), 0)
    expect(total).toBeCloseTo(2000 / 20, 6)
  })

  it('hình thoi nằm hẳn một bên, đỉnh trên chạm đường: không sinh nét dài 0 hay nét ngoài vùng', () => {
    const below = [
      { x: 1000, y: 0 },
      { x: 2000, y: 1000 },
      { x: 1000, y: 2000 },
      { x: 0, y: 1000 },
    ]
    const above = below.map((p) => ({ x: p.x, y: -p.y }))
    expectClean([below])
    expectClean([above])
  })

  it.each([
    [
      'đỉnh trên chạm đường',
      [
        { x: 500, y: 0 },
        { x: 1500, y: 900 },
        { x: 100, y: 1300 },
      ],
    ],
    [
      'đỉnh dưới chạm đường',
      [
        { x: 500, y: 0 },
        { x: 1500, y: -900 },
        { x: 100, y: -1300 },
      ],
    ],
  ])('tam giác %s tại một đỉnh', (_t, tri) => {
    const strokes = expectClean([tri])
    // đường j = 0 chỉ chạm một điểm: không có nét ngang nào dài trên đó
    for (const s of onLine(strokes)) expect(strokeLen(s)).toBeLessThan(1e-6)
  })

  it('hai hình chữ nhật chung cạnh y = 0 trùng đường hatch: nét y = 0 chỉ xuất hiện ở đúng một vùng', () => {
    const up = rectRing(0, -500, 1000, 500)
    const down = rectRing(0, 0, 1000, 500)
    const nUp = onLine(strokesOf(hatch(V, [up], 'AR-BRSTD', opts))).length
    const nDown = onLine(strokesOf(hatch(V, [down], 'AR-BRSTD', opts))).length
    expect(nUp + nDown).toBe(1)
    // và cả hình ghép (không có cạnh giữa) cũng chỉ có một nét y = 0, dài 50 mm
    const whole = onLine(
      strokesOf(hatch(V, [rectRing(0, -500, 1000, 1000)], 'AR-BRSTD', opts)),
    )
    expect(whole).toHaveLength(1)
    expect(strokeLen(whole[0])).toBeCloseTo(50, 6)
  })
})

describe('hatch: tính xác định', () => {
  it('chạy 2 lần giống hệt (toEqual)', () => {
    const rings = [L_SHAPE, HOLE_TRI, HOLE_RECT]
    const a = hatch(V50, rings, 'AR-CONC', { scale: 10, outline: 'thin' })
    const b = hatch(V50, rings, 'AR-CONC', { scale: 10, outline: 'thin' })
    expect(b).toEqual(a)
  })

  it('không làm thay đổi dữ liệu vào', () => {
    const ring = rectRing(0, 0, 1000, 500)
    const copy = structuredClone(ring)
    const v = structuredClone(V20)
    hatch(V20, [ring], 'AR-CONC', { scale: 10, origin: { x: 5, y: 5 } })
    expect(ring).toEqual(copy)
    expect(V20).toEqual(v)
  })

  it('thứ tự đỉnh của vòng (xuôi/ngược) không đổi tập nét', () => {
    const ring = rectRing(130, 130, 940, 640)
    const a = strokesOf(hatch(V20, [ring], 'ANSI31', { scale: 100 }))
    const b = strokesOf(
      hatch(V20, [[...ring].reverse()], 'ANSI31', { scale: 100 }),
    )
    const key = (ss: Array<Stroke>) =>
      ss
        .map(([p, q]) => {
          const [m, n] =
            p[0] < q[0] || (p[0] === q[0] && p[1] <= q[1]) ? [p, q] : [q, p]
          return [m[0], m[1], n[0], n[1]].map((x) => x.toFixed(5)).join(',')
        })
        .sort()
    expect(key(b)).toEqual(key(a))
  })
})
