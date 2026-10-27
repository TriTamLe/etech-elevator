import { describe, expect, it } from 'vitest'

import { derive } from '#/domain/derive'
import { presetParams } from '#/domain/presets'
import { coverFooter, coverSheet } from '#/drawing/sheets/cover'
import {
  INNER,
  numbersOf,
  pointsOf,
  textSpan,
  texts,
} from '#/tests/drawing/helpers'

const base = () => {
  const p = presetParams('house-5f')
  p.project.issuePlace = 'Đà Nẵng'
  p.project.issueMonth = '10/2026'
  return p
}
const render = (p = base()) => coverSheet(p, derive(p))

describe('coverSheet', () => {
  it('có tên công trình, địa chỉ đầy đủ, hạng mục và footer', () => {
    const p = base()
    const all = texts(render(p)).map((t) => t.text)
    expect(all.some((t) => t.includes(p.project.name))).toBe(true)
    expect(all.some((t) => t.includes(p.project.address))).toBe(true)
    expect(all.some((t) => t.includes(derive(p).category))).toBe(true)
    expect(all).toContain('ĐÀ NẴNG, 10/2026')
  })

  it('coverFooter bỏ phần trống', () => {
    const p = base()
    expect(coverFooter(p)).toBe('ĐÀ NẴNG, 10/2026')
    p.project.issuePlace = ''
    expect(coverFooter(p)).toBe('10/2026')
    p.project.issueMonth = ''
    expect(coverFooter(p)).toBe('')
  })

  const long = 'Nguyễn Văn Đặng Thị Hoàng '.repeat(12).slice(0, 300)
  it.each([
    ['bình thường', base()],
    [
      'tên + địa chỉ 300 ký tự',
      (() => {
        const p = base()
        p.project.name = long
        p.project.address = long
        return p
      })(),
    ],
    [
      'tên một từ dài 300 ký tự',
      (() => {
        const p = base()
        p.project.name = 'W'.repeat(300)
        p.project.address = 'Đ'.repeat(300)
        return p
      })(),
    ],
  ])('%s: số hữu hạn, trong tờ giấy, text trong viền', (_n, p) => {
    const prims = render(p)
    for (const pr of prims) {
      for (const n of numbersOf(pr)) expect(Number.isFinite(n)).toBe(true)
      for (const [x, y] of pointsOf(pr)) {
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThanOrEqual(420)
        expect(y).toBeGreaterThanOrEqual(0)
        expect(y).toBeLessThanOrEqual(297)
      }
    }
    for (const t of texts(prims)) {
      const [a, b] = textSpan(t)
      expect(a, t.text).toBeGreaterThanOrEqual(INNER.left - 1e-6)
      expect(b, t.text).toBeLessThanOrEqual(INNER.right + 1e-6)
    }
  })
})
