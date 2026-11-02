import { describe, expect, it } from 'vitest'

import {
  UNDERLINE_DROP,
  hline,
  rect,
  text,
  underlinedText,
  vline,
} from '#/drawing/prims'
import { measure } from '#/drawing/text-metrics'
import type { LinePrim, TextPrim } from '#/drawing/types'
import { numbersOf, textSpan } from '#/tests/drawing/helpers'

const parts = (ps: ReturnType<typeof underlinedText>) => {
  const t = ps.find((p): p is TextPrim => p.kind === 'text')!
  const l = ps.find((p): p is LinePrim => p.kind === 'line')!
  return { t, l }
}

describe('underlinedText', () => {
  it('trả đúng 2 prim: chữ rồi gạch chân', () => {
    const out = underlinedText(10, 50, 'MẶT CẮT C-C', 5)
    expect(out).toHaveLength(2)
    expect(out[0].kind).toBe('text')
    expect(out[1].kind).toBe('line')
  })

  it('UNDERLINE_DROP = 0,15 em', () => {
    expect(UNDERLINE_DROP).toBe(0.15)
  })

  it('anchor start (mặc định): gạch từ x đến x + độ rộng chữ, dưới baseline 0,15 × size', () => {
    const { t, l } = parts(underlinedText(10, 50, 'Ghi chú :', 4))
    const w = measure('Ghi chú :', 4)
    expect(t.x).toBe(10)
    expect(t.y).toBe(50)
    expect(l.a).toEqual({ x: 10, y: 50 + UNDERLINE_DROP * 4 })
    expect(l.b.x).toBeCloseTo(10 + w, 9)
    expect(l.b.y).toBe(l.a.y)
  })

  it('anchor middle: gạch canh giữa quanh x', () => {
    const { t, l } = parts(
      underlinedText(100, 50, 'Hướng cửa', 6, { anchor: 'middle' }),
    )
    const w = measure('Hướng cửa', 6)
    expect(t.anchor).toBe('middle')
    expect(l.a.x).toBeCloseTo(100 - w / 2, 9)
    expect(l.b.x).toBeCloseTo(100 + w / 2, 9)
  })

  it('anchor end: gạch kết thúc tại x', () => {
    const { l } = parts(
      underlinedText(100, 50, 'Ghi chú', 6, { anchor: 'end' }),
    )
    const w = measure('Ghi chú', 6)
    expect(l.a.x).toBeCloseTo(100 - w, 9)
    expect(l.b.x).toBeCloseTo(100, 9)
  })

  it.each(['start', 'middle', 'end'] as const)(
    'anchor %s: gạch trùng đúng khoảng chữ (textSpan)',
    (anchor) => {
      const { t, l } = parts(
        underlinedText(77, 31, 'LỖ CHỜ = 900', 4.5, { anchor }),
      )
      const [lo, hi] = textSpan(t)
      expect(Math.min(l.a.x, l.b.x)).toBeCloseTo(lo, 9)
      expect(Math.max(l.a.x, l.b.x)).toBeCloseTo(hi, 9)
    },
  )

  it('bold: gạch đo theo bề rộng chữ đậm (rộng hơn chữ thường)', () => {
    const bold = parts(underlinedText(0, 0, 'MẶT CẮT', 6, { bold: true }))
    const reg = parts(underlinedText(0, 0, 'MẶT CẮT', 6))
    expect(bold.t.bold).toBe(true)
    expect(bold.l.b.x).toBeCloseTo(measure('MẶT CẮT', 6, { bold: true }), 9)
    expect(bold.l.b.x).toBeGreaterThan(reg.l.b.x)
  })

  it('weight: mặc định thin, tùy chỉnh được, và không lọt vào prim chữ', () => {
    expect(parts(underlinedText(0, 0, 'a', 5)).l.weight).toBe('thin')
    const custom = parts(underlinedText(0, 0, 'a', 5, { weight: 'medium' }))
    expect(custom.l.weight).toBe('medium')
    expect('weight' in custom.t).toBe(false)
  })

  it('chữ rỗng: gạch dài 0, không ra NaN', () => {
    const out = underlinedText(5, 5, '', 4)
    for (const p of out)
      for (const n of numbersOf(p)) expect(Number.isFinite(n)).toBe(true)
    expect(parts(out).l.b.x).toBe(5)
  })

  it('gọi 2 lần ra kết quả giống hệt', () => {
    const f = () => underlinedText(1, 2, 'Tầng', 3, { anchor: 'middle' })
    expect(f()).toEqual(f())
  })
})

describe('hline / vline / rect / text: bộ dựng', () => {
  it('hline(y, x1, x2) là đường ngang', () => {
    expect(hline(5, 1, 9, 'thin')).toEqual({
      kind: 'line',
      a: { x: 1, y: 5 },
      b: { x: 9, y: 5 },
      weight: 'thin',
    })
  })

  it('vline(x, y1, y2) là đường đứng', () => {
    expect(vline(5, 1, 9)).toEqual({
      kind: 'line',
      a: { x: 5, y: 1 },
      b: { x: 5, y: 9 },
      weight: undefined,
    })
  })

  it('rect giữ x, y, w, h và tùy chọn', () => {
    expect(rect({ x: 1, y: 2, w: 3, h: 4 }, { fill: 'ink', r: 1 })).toEqual({
      kind: 'rect',
      x: 1,
      y: 2,
      w: 3,
      h: 4,
      fill: 'ink',
      r: 1,
    })
  })

  it('text mang theo anchor và rotate', () => {
    expect(text(1, 2, 'a', 3, { anchor: 'middle', rotate: -90 })).toEqual({
      kind: 'text',
      x: 1,
      y: 2,
      text: 'a',
      size: 3,
      anchor: 'middle',
      rotate: -90,
    })
  })
})
