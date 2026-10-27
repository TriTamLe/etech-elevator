import { openSync } from 'fontkit'
import { describe, expect, it } from 'vitest'

import { ellipsize, fitSize, measure, wrap } from '#/drawing/text-metrics'
import type { FontStyle } from '#/drawing/text-metrics'

const FILES: Array<[string, FontStyle]> = [
  ['Tinos-Regular.ttf', {}],
  ['Tinos-Bold.ttf', { bold: true }],
  ['Tinos-Italic.ttf', { italic: true }],
  ['Tinos-BoldItalic.ttf', { bold: true, italic: true }],
]

function fontkitWidth(file: string, text: string, size: number): number {
  const font = openSync(`public/fonts/tinos/${file}`) as any
  let units = 0
  for (const ch of text.normalize('NFC'))
    units += font.glyphForCodePoint(ch.codePointAt(0)!).advanceWidth
  return (units / font.unitsPerEm) * size
}

const SAMPLES = ['BẢN VẼ XÂY DỰNG', 'Nguyễn Văn Ưng, Đà Nẵng 123/4']

describe('measure', () => {
  it.each(FILES)('khớp advanceWidth của fontkit (%s)', (file, style) => {
    for (const s of SAMPLES)
      expect(
        Math.abs(measure(s, 10, style) - fontkitWidth(file, s, 10)),
      ).toBeLessThan(0.01)
  })

  it('chuỗi NFD đo bằng chuỗi NFC', () => {
    const s = 'Nguyễn'
    expect(measure(s.normalize('NFD'), 10)).toBeCloseTo(
      measure(s.normalize('NFC'), 10),
      9,
    )
  })

  it('chuỗi rỗng = 0, tỉ lệ thuận với size', () => {
    expect(measure('', 10)).toBe(0)
    expect(measure('abc', 20)).toBeCloseTo(2 * measure('abc', 10), 9)
  })
})

describe('fitSize', () => {
  const text = 'Một tên công trình khá dài để thử co chữ'
  it.each([1, 10, 50, 200, 1000])(
    'maxW=%s: trong [minSize, size], vừa khi > minSize',
    (maxW) => {
      const r = fitSize(text, maxW, 10, 2)
      expect(r).toBeLessThanOrEqual(10)
      expect(r).toBeGreaterThanOrEqual(2)
      if (r > 2) expect(measure(text, r)).toBeLessThanOrEqual(maxW + 1e-9)
    },
  )
  it('chuỗi rỗng giữ nguyên size', () => {
    expect(fitSize('', 5, 10, 2)).toBe(10)
  })
})

describe('ellipsize', () => {
  const text = 'Số 64 Nguyễn Đình Chiểu, P. Đa Kao, Quận 1, TP. HCM'
  it('trả nguyên chuỗi khi vừa', () => {
    expect(ellipsize(text, 10000, 10)).toBe(text)
  })
  it.each([5, 20, 60, 120, 200])(
    'maxW=%s: luôn vừa, kết thúc bằng … khi bị cắt',
    (maxW) => {
      const r = ellipsize(text, maxW, 10)
      expect(measure(r, 10)).toBeLessThanOrEqual(maxW)
      if (r !== '') expect(r.endsWith('…')).toBe(true)
    },
  )
  it('bold/italic cũng vừa', () => {
    const r = ellipsize(text, 80, 10, { bold: true, italic: true })
    expect(measure(r, 10, { bold: true, italic: true })).toBeLessThanOrEqual(80)
  })
})

describe('wrap', () => {
  const text =
    'Tầng 1, Tòa Nhà Vietphone Building, Số 64 Nguyễn Đình Chiểu, P. Đa Kao, Quận 1, TP. HCM '.repeat(
      4,
    )
  it.each([1, 2, 3, 5])(
    'maxLines=%s: không quá số dòng, mọi dòng vừa',
    (maxLines) => {
      for (const maxW of [30, 80, 250]) {
        const lines = wrap(text, maxW, 10, maxLines)
        expect(lines.length).toBeLessThanOrEqual(maxLines)
        for (const l of lines) expect(measure(l, 10)).toBeLessThanOrEqual(maxW)
      }
    },
  )
  it('chuỗi ngắn ra 1 dòng nguyên văn', () => {
    expect(wrap('abc def', 1000, 10, 3)).toEqual(['abc def'])
  })
  it('từ đơn quá dài vẫn vừa', () => {
    const lines = wrap('x'.repeat(200), 50, 10, 2)
    for (const l of lines) expect(measure(l, 10)).toBeLessThanOrEqual(50)
  })
})
