import { describe, expect, it } from 'vitest'

import { SECTION_MARK, sectionMark } from '#/drawing/primitives/section-mark'
import type { LinePrim } from '#/drawing/types'
import { numbersOf, texts } from '#/tests/drawing/helpers'

const AT = { x: 40, y: 120 }

describe('sectionMark', () => {
  it('hằng số theo bản vẽ mẫu: chữ 9, vạch dài 14, chữ cao hơn vạch 0,33 em', () => {
    expect(SECTION_MARK).toEqual({
      size: 9,
      length: 14,
      rise: 0.33,
      pointer: { gap: 0.09, rise: 1.42, arrow: 0.1 },
    })
  })

  it('một chữ cái đứng trên một vạch ngang nét medium', () => {
    const out = sectionMark(AT, 'A', { pointer: false })
    expect(out).toHaveLength(2)
    const [t] = texts(out)
    const line = out.find((p): p is LinePrim => p.kind === 'line')!
    expect(t.text).toBe('A')
    expect(t.size).toBe(SECTION_MARK.size)
    expect(line.weight).toBe('medium')
  })

  it('vạch bắt đầu tại `at` và chạy sang phải đúng `length`', () => {
    const line = sectionMark(AT, 'B').find(
      (p): p is LinePrim => p.kind === 'line',
    )!
    expect(line.a).toEqual(AT)
    expect(line.b).toEqual({ x: AT.x + SECTION_MARK.length, y: AT.y })
  })

  it('chữ bắt đầu tại at.x, baseline cao hơn vạch rise × size (y nhỏ hơn)', () => {
    const [t] = texts(sectionMark(AT, 'C'))
    expect(t.x).toBe(AT.x)
    expect(t.y).toBeCloseTo(AT.y - SECTION_MARK.rise * SECTION_MARK.size, 9)
    expect(t.y).toBeLessThan(AT.y)
  })

  it('size và length tùy chỉnh', () => {
    const out = sectionMark(AT, 'D', { size: 12, length: 20 })
    const [t] = texts(out)
    const line = out.find((p): p is LinePrim => p.kind === 'line')!
    expect(t.size).toBe(12)
    expect(t.y).toBeCloseTo(AT.y - 0.33 * 12, 9)
    expect(line.b.x - line.a.x).toBe(20)
  })

  it('mọi tọa độ hữu hạn; gọi 2 lần giống hệt', () => {
    const f = () => sectionMark({ x: 12.5, y: 99.25 }, 'A')
    const a = f()
    expect(f()).toEqual(a)
    for (const p of a)
      for (const n of numbersOf(p)) expect(Number.isFinite(n)).toBe(true)
  })

  it('nét chỉ hướng nhìn: nét đứng mảnh ngay phải chữ, từ 1,42 em phía trên xuống vạch, mũi tên tô đặc ở vạch', () => {
    const out = sectionMark(AT, 'B')
    expect(out).toHaveLength(4)
    const lines = out.filter((p): p is LinePrim => p.kind === 'line')
    const stroke = lines.find((l) => l.a.x === l.b.x)!
    const [t] = texts(out)
    expect(stroke.weight).toBe('thin')
    expect(stroke.a.x).toBeGreaterThan(t.x)
    expect(stroke.a.x).toBeLessThan(AT.x + SECTION_MARK.length)
    expect(stroke.b).toEqual({ x: stroke.a.x, y: AT.y })
    expect(stroke.a.y).toBeCloseTo(AT.y - 1.42 * SECTION_MARK.size, 9)
    const head = out.find((p) => p.kind === 'polyline')
    expect(head).toBeDefined()
  })

  it('pointer: false bỏ nét chỉ hướng', () => {
    expect(sectionMark(AT, 'C', { pointer: false })).toHaveLength(2)
  })
})
