import { describe, expect, it } from 'vitest'

import { derive } from '#/domain/derive'
import { presetParams } from '#/domain/presets'
import type { ElevatorParams } from '#/domain/schema'
import { SHEET_AREA } from '#/drawing/frame/layout'
import { primsBounds } from '#/drawing/sheets/figure'
import { PLAN } from '#/drawing/sheets/figure-layout'
import { placeSymbol, placedBox, symbol } from '#/drawing/symbols'
import type { Prim } from '#/drawing/types'
import {
  INFILL_NOTE,
  PLAN_TITLE,
  planJamb,
  planSheet,
} from '#/drawing/sheets/plan'
import {
  EPS,
  expectInside,
  numbersOf,
  sideWalls,
  texts,
} from '#/tests/drawing/helpers'

const clone = (id: 'house-5f' | 'hotel-9f') =>
  structuredClone<ElevatorParams>(presetParams(id))
const draw = (p: ElevatorParams) => planSheet(p, derive(p))
const words = (p: ElevatorParams) => texts(draw(p)).map((t) => t.text)

const EXPECT = {
  'house-5f': { ah: 1500, bh: 1900, hole: 900, op: 700, cw: 1100, cd: 1300 },
  'hotel-9f': { ah: 1800, bh: 2000, hole: 1000, op: 800, cw: 1400, cd: 1400 },
} as const

describe.each(['house-5f', 'hotel-9f'] as const)('planSheet: %s', (id) => {
  const e = EXPECT[id]
  const p = clone(id)
  const out = draw(p)
  const ws = words(p)

  it('mọi số hữu hạn; vẽ 2 lần giống hệt', () => {
    for (const q of out)
      for (const n of numbersOf(q)) expect(Number.isFinite(n)).toBe(true)
    expect(draw(clone(id))).toEqual(out)
  })

  it('mọi điểm và hộp bao nằm trong SHEET_AREA', () => {
    expectInside(out, SHEET_AREA)
    const b = primsBounds(out)!
    expect(b.x).toBeGreaterThanOrEqual(SHEET_AREA.left - EPS)
    expect(b.x + b.w).toBeLessThanOrEqual(SHEET_AREA.right + EPS)
    expect(b.y).toBeGreaterThanOrEqual(SHEET_AREA.top - EPS)
    expect(b.y + b.h).toBeLessThanOrEqual(SHEET_AREA.bottom + EPS)
  })

  it('có tiêu đề và chữ "Hướng cửa vào thang máy"', () => {
    expect(ws).toContain(PLAN_TITLE)
    expect(ws).toContain('Hướng cửa vào thang máy')
  })

  it('có các kích thước chính: Chiều rộng, Chiều sâu, LỖ CHỜ, OP', () => {
    expect(ws).toContain(`Chiều rộng = ${e.ah}`)
    expect(ws).toContain(`Chiều sâu = ${e.bh}`)
    expect(ws).toContain(`LỖ CHỜ = ${e.hole}`)
    expect(ws).toContain(`OP = ${e.op}`)
  })

  it('có kích thước CW và CD của cabin', () => {
    expect(ws).toContain(String(e.cw))
    expect(ws).toContain(String(e.cd))
  })

  it('mỗi bên lỗ chờ là (AH − lỗ chờ) / 2', () => {
    expect(ws).toContain(String((e.ah - e.hole) / 2))
  })
})

describe('planSheet: ghi chú xây chèn', () => {
  it.each(['house-5f', 'hotel-9f'] as const)('%s: bật/tắt infillNote', (id) => {
    const on = clone(id)
    on.structure.infillNote = true
    const off = clone(id)
    off.structure.infillNote = false
    const wOn = words(on)
    const wOff = words(off)
    expect(wOn).toContain(INFILL_NOTE.title)
    expect(wOn).toContain('Xây chèn sau')
    for (const l of INFILL_NOTE.body) expect(wOn).toContain(l)
    expect(wOff).not.toContain(INFILL_NOTE.title)
    expect(wOff).not.toContain('Xây chèn sau')
    expectInside(draw(on), SHEET_AREA)
  })

  it('house-5f (preset bật) có ghi chú, hotel-9f (preset tắt) không có', () => {
    expect(words(clone('house-5f'))).toContain('Ghi chú :')
    expect(words(clone('hotel-9f'))).not.toContain('Ghi chú :')
  })
})

describe('planSheet: theo tham số', () => {
  it('đổi OP thì nhãn OP và LỖ CHỜ đổi theo', () => {
    const p = clone('house-5f')
    p.tech.door.width = 800
    const ws = words(p)
    expect(ws).toContain('OP = 800')
    expect(ws).not.toContain('OP = 700')
    expect(ws).toContain('LỖ CHỜ = 1000')
  })

  it('đổi AH / BH thì nhãn đổi theo', () => {
    const p = clone('house-5f')
    p.tech.shaft.width = 1700
    p.tech.shaft.depth = 2100
    const ws = words(p)
    expect(ws).toContain('Chiều rộng = 1700')
    expect(ws).toContain('Chiều sâu = 2100')
  })

  it('thông số lạ không sinh NaN và vẫn nằm trong vùng vẽ', () => {
    const p = clone('house-5f')
    p.tech.shaft.width = 2200
    p.tech.shaft.depth = 2500
    p.tech.door.width = 900
    p.tech.car.width = 1600
    p.tech.car.depth = 1500
    const out = draw(p)
    expect(out.length).toBeGreaterThan(0)
    for (const q of out)
      for (const n of numbersOf(q)) expect(Number.isFinite(n)).toBe(true)
    expectInside(out, SHEET_AREA)
    const ws = texts(out).map((t) => t.text)
    expect(ws).toContain('Chiều rộng = 2200')
    expect(ws).toContain('OP = 900')
  })

  it('cửa 2S vẫn vẽ được (dùng ký hiệu CO), không ném lỗi', () => {
    const p = clone('house-5f')
    p.tech.door.type = '2S'
    expect(() => draw(p)).not.toThrow()
  })
})

describe('planJamb', () => {
  it('có tầng bao che hẹp -> narrow', () => {
    for (const id of ['house-5f', 'hotel-9f'] as const)
      expect(planJamb(derive(presetParams(id)))).toBe('narrow')
  })

  it('chỉ có bao che rộng -> wide', () => {
    const p = clone('house-5f')
    for (const f of p.floors) f.jamb = 'wide'
    const d = derive(p)
    expect(d.openings.narrow).toBeFalsy()
    expect(planJamb(d)).toBe('wide')
  })

  it('chỉ có bao che hẹp -> narrow', () => {
    const p = clone('house-5f')
    for (const f of p.floors) f.jamb = 'narrow'
    expect(planJamb(derive(p))).toBe('narrow')
  })
})

// Hình học trên giấy. Hình không lộ view ra ngoài, nên suy tỷ lệ và gốc từ chính các tường.
function geometry(p: ElevatorParams) {
  const out = draw(p)
  const w = sideWalls(out, p.tech.shaft.width)
  const outer = out.filter(
    (q): q is Extract<Prim, { kind: 'polyline' }> =>
      q.kind === 'polyline' && q.pts.length === 6 && q.weight === 'thin',
  )[0]
  return { out, ...w, bhY: w.bottom, outer }
}

describe('planSheet: hình học trên giấy', () => {
  const close = (a: number, b: number, eps = 0.01) =>
    expect(Math.abs(a - b)).toBeLessThan(eps)

  it.each(['house-5f', 'hotel-9f'] as const)(
    '%s: cabin canh giữa hai tường (khe trái = khe phải)',
    (id) => {
      const p = clone(id)
      const g = geometry(p)
      const t = PLAN.carWall * g.k
      const carL = g.outer.pts[1].x + t
      const carR = g.outer.pts[4].x - t
      close(carL - g.innerL, g.innerR - carR)
      close(carR - carL, p.tech.car.width * g.k)
      close(
        carL - g.innerL,
        ((p.tech.shaft.width - p.tech.car.width) / 2) * g.k,
      )
    },
  )

  it('hai ray cabin đối xứng qua trục cabin', () => {
    const p = clone('house-5f')
    const g = geometry(p)
    const t = PLAN.carWall * g.k
    const carL = g.outer.pts[1].x + t
    const carR = g.outer.pts[4].x - t
    const axis = (carL + carR) / 2
    const top = g.outer.pts[2].y
    const bottom = g.outer.pts[1].y
    const side = g.out.filter(
      (q) =>
        (q.kind === 'polyline' || q.kind === 'arc' || q.kind === 'circle') &&
        q.weight === 'thin',
    )
    const pts = side.flatMap((q) =>
      q.kind === 'polyline'
        ? q.pts
        : q.kind === 'arc' || q.kind === 'circle'
          ? [q.c]
          : [],
    )
    const inBand = (a: { x: number; y: number }) => a.y > top && a.y < bottom
    const leftPts = pts.filter(
      (a) => inBand(a) && a.x > g.innerL && a.x < g.outer.pts[1].x - 0.01,
    )
    const rightPts = pts.filter(
      (a) => inBand(a) && a.x < g.innerR && a.x > g.outer.pts[4].x + 0.01,
    )
    expect(leftPts.length).toBeGreaterThan(10)
    expect(rightPts.length).toBe(leftPts.length)
    for (const a of leftPts)
      expect(
        rightPts.some(
          (b) =>
            Math.abs(b.x - (2 * axis - a.x)) < 0.01 &&
            Math.abs(b.y - a.y) < 0.01,
        ),
      ).toBe(true)
  })

  it.each([600, 800, 900])(
    'OP %i: cửa đối xứng qua tâm lỗ, rộng OP + 700',
    (op) => {
      const p = clone('house-5f')
      p.tech.door.width = op
      const g = geometry(p)
      const cxp = (g.innerL + g.innerR) / 2
      const expected = placeSymbol(symbol('door-co-plan'), {
        at: { x: cxp, y: g.bhY },
        scale: g.k,
        stretch: { x: (op - PLAN.doorBaseOp) / 2 },
      })
      const box = placedBox(symbol('door-co-plan'), {
        at: { x: cxp, y: g.bhY },
        scale: g.k,
        stretch: { x: (op - PLAN.doorBaseOp) / 2 },
      })
      close(box.x + box.w / 2, cxp)
      close(box.w, (1400 + op - 700) * g.k)
      // Từng điểm của cửa đúng vị trí đã tính trong bản vẽ thật.
      const actual = g.out.flatMap((q) => (q.kind === 'polyline' ? q.pts : []))
      for (const q of expected)
        if (q.kind === 'polyline')
          for (const a of q.pts)
            expect(
              actual.some(
                (b) => Math.abs(b.x - a.x) < 0.01 && Math.abs(b.y - a.y) < 0.01,
              ),
            ).toBe(true)
    },
  )

  it.each([600, 800, 900])(
    'OP %i: hai mảnh tường trước chừa lỗ chờ ở giữa (đối xứng)',
    (op) => {
      const p = clone('house-5f')
      p.tech.door.width = op
      const g = geometry(p)
      // Hai mảnh tường trước: hình chữ nhật medium kín, đáy y = BH + W, nằm giữa hai cột.
      const pieces = g.rects
        .filter((r) => Math.abs(r.y0 - g.bhY) < 0.01)
        .filter((r) => r.x0 > g.innerL - 0.01 && r.x1 < g.innerR + 0.01)
        .sort((a, b) => a.x0 - b.x0)
      expect(pieces).toHaveLength(2)
      const gap0 = pieces[0].x1
      const gap1 = pieces[1].x0
      close((gap0 + gap1) / 2, (g.innerL + g.innerR) / 2)
      close(gap1 - gap0, (op + 200) * g.k)
    },
  )
})

describe('planSheet: trường hợp biên', () => {
  const finite = (out: Array<Prim>) => {
    for (const q of out)
      for (const n of numbersOf(q)) expect(Number.isFinite(n)).toBe(true)
  }

  it('chỉ có bao che rộng vẫn vẽ hợp lệ, LỖ CHỜ = 1100', () => {
    const p = clone('house-5f')
    for (const f of p.floors) f.jamb = 'wide'
    const out = draw(p)
    finite(out)
    expectInside(out, SHEET_AREA)
    const ws = texts(out).map((t) => t.text)
    expect(ws).toContain('LỖ CHỜ = 1100')
    expect(ws).toContain('200') // mỗi bên (1500 − 1100) / 2
  })

  it('không tầng nào có cửa: vẫn vẽ, không NaN', () => {
    const p = clone('house-5f')
    for (const f of p.floors) f.hasDoor = false
    const out = draw(p)
    finite(out)
    expectInside(out, SHEET_AREA)
    expect(texts(out).map((t) => t.text)).toContain('LỖ CHỜ = 900')
  })

  it('AH hẹp làm khoảng tường bên âm: không NaN, vẫn trong vùng vẽ', () => {
    const p = clone('house-5f')
    p.tech.shaft.width = 800 // OP 700 + 200 > AH
    const out = draw(p)
    finite(out)
    expectInside(out, SHEET_AREA)
  })
})
