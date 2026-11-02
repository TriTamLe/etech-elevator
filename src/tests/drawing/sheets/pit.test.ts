import { describe, expect, it } from 'vitest'

import { derive } from '#/domain/derive'
import { presetParams } from '#/domain/presets'
import type { ElevatorParams } from '#/domain/schema'
import { SHEET_AREA } from '#/drawing/frame/layout'
import { primsBounds } from '#/drawing/sheets/figure'
import { PIT_NOTE, PIT_TITLE, pitSheet } from '#/drawing/sheets/pit'
import { UNDERLINE_DROP } from '#/drawing/prims'
import type { LinePrim } from '#/drawing/types'
import {
  EPS,
  expectInside,
  numbersOf,
  sideWalls,
  textSpan,
  texts,
} from '#/tests/drawing/helpers'

const clone = (id: 'house-5f' | 'hotel-9f') =>
  structuredClone<ElevatorParams>(presetParams(id))
const draw = (p: ElevatorParams) => pitSheet(p, derive(p))

const EXPECT = {
  'house-5f': { ah: 1500, bh: 1900, pit: 1400 },
  'hotel-9f': { ah: 1800, bh: 2000, pit: 1500 },
} as const

describe.each(['house-5f', 'hotel-9f'] as const)('pitSheet: %s', (id) => {
  const e = EXPECT[id]
  const p = clone(id)
  const out = draw(p)
  const ws = texts(out).map((t) => t.text)

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
    expect(ws).toContain(PIT_TITLE)
    expect(ws).toContain('Hướng cửa vào thang máy')
  })

  it('mặt cắt có "PIT = …"', () => {
    expect(ws).toContain(`PIT = ${e.pit}`)
  })

  it('mặt bằng có số trần AH và BH', () => {
    expect(ws).toContain(String(e.ah))
    expect(ws).toContain(String(e.bh))
  })

  it('có ghi chú "*Chống thấm Pit hố thang"', () => {
    expect(ws).toContain(`*${PIT_NOTE}`)
  })

  it('ghi chú có 3 đường dẫn mảnh xuất phát cùng một y (dưới gạch chân)', () => {
    const note = texts(out).find((t) => t.text === `*${PIT_NOTE}`)!
    const y = note.y + UNDERLINE_DROP * note.size
    const guides = out.filter(
      (q): q is LinePrim =>
        q.kind === 'line' &&
        q.weight === 'thin' &&
        Math.abs(q.a.y - y) < 1e-9 &&
        Math.abs(q.b.y - q.a.y) > 1e-9,
    )
    expect(guides).toHaveLength(3)
    // một đường tới vách trái, một tới sàn (giữa), một tới vách phải
    const xs = guides.map((g) => g.b.x).sort((a, b) => a - b)
    expect(xs[0]).toBeLessThan(xs[1])
    expect(xs[1]).toBeLessThan(xs[2])
  })
})

describe('pitSheet: theo tham số', () => {
  it('đổi PIT thì nhãn PIT đổi theo', () => {
    const p = clone('house-5f')
    p.tech.pit = 1600
    const ws = texts(draw(p)).map((t) => t.text)
    expect(ws).toContain('PIT = 1600')
    expect(ws).not.toContain('PIT = 1400')
  })

  it('thông số lạ không sinh NaN và vẫn nằm trong vùng vẽ', () => {
    const p = clone('house-5f')
    p.tech.shaft.width = 2200
    p.tech.shaft.depth = 2500
    p.tech.door.width = 900
    p.tech.car.width = 1600
    p.tech.car.depth = 1500
    const out = draw(p)
    for (const q of out)
      for (const n of numbersOf(q)) expect(Number.isFinite(n)).toBe(true)
    expectInside(out, SHEET_AREA)
  })
})

describe('pitSheet: hố hẹp', () => {
  it.each([1300, 1000])(
    'AH %i: chữ "*Chống thấm Pit hố thang" (co lại) nằm giữa hai mặt trong vách pit theo x',
    (ah) => {
      const p = clone('house-5f')
      p.tech.shaft.width = ah
      const out = draw(p)
      for (const q of out)
        for (const n of numbersOf(q)) expect(Number.isFinite(n)).toBe(true)
      const g = sideWalls(out, ah)
      const note = texts(out).find((t) => t.text.startsWith('*Chống thấm'))!
      expect(note).toBeDefined()
      const [x0, x1] = textSpan(note)
      expect(x0).toBeGreaterThanOrEqual(g.innerL - EPS)
      expect(x1).toBeLessThanOrEqual(g.innerR + EPS)
    },
  )

  it.each(['house-5f', 'hotel-9f'] as const)(
    '%s: chữ ghi chú nằm giữa hai mặt trong vách pit theo x',
    (id) => {
      const p = clone(id)
      const out = draw(p)
      const g = sideWalls(out, p.tech.shaft.width)
      const note = texts(out).find((t) => t.text === `*${PIT_NOTE}`)!
      const [x0, x1] = textSpan(note)
      expect(x0).toBeGreaterThanOrEqual(g.innerL - EPS)
      expect(x1).toBeLessThanOrEqual(g.innerR + EPS)
    },
  )
})
