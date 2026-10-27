import { describe, expect, it } from 'vitest'

import { derive } from '#/domain/derive'
import { presetParams } from '#/domain/presets'
import { COVER, RESPONSIBILITY, SPEC, TITLE } from '#/drawing/frame/layout'
import { titleBlock } from '#/drawing/frame/title-block'
import { fittedText } from '#/drawing/prims'
import { coverSheet } from '#/drawing/sheets/cover'
import { responsibilitySheet } from '#/drawing/sheets/responsibility'
import { specSheet } from '#/drawing/sheets/spec'
import { fitSize } from '#/drawing/text-metrics'
import { textSpan, texts } from '#/tests/drawing/helpers'

const NAME = 'CÔNG TRÌNH MẪU 2 – NHÀ Ở 5 TẦNG'
const EPS = 1e-6

describe('fittedText: no false ellipsis', () => {
  it('never adds "…" while the fitted size is above minSize', () => {
    for (let maxW = 20; maxW <= 80; maxW += 0.37) {
      for (const style of [{}, { bold: true, italic: true }]) {
        const size = fitSize(NAME, maxW, 4.09, 1, style)
        const [t] = fittedText(0, 0, NAME, maxW, 4.09, 1, style)
        if (size > 1) expect(t.kind === 'text' && t.text).toBe(NAME)
      }
    }
  })

  it('sweeping synthetic strings: either full text or ends at minSize', () => {
    const samples = [
      'xxxxxxxxxxxxxxxxxx Đ Đ Đ Đ',
      'Nguyễn Văn Phú',
      'ĐƯỜNG MẪU - TPĐN',
    ]
    for (const s of samples) {
      for (let maxW = 5; maxW <= 60; maxW += 0.13) {
        const size = fitSize(s, maxW, 3.13, 0.5)
        const [t] = fittedText(0, 0, s, maxW, 3.13, 0.5)
        if (size > 0.5) expect(t.kind === 'text' && t.text).toBe(s)
      }
    }
  })
})

function titleAddressTexts(shortAddress: string) {
  const p = presetParams('house-5f')
  p.project.shortAddress = shortAddress
  const d = derive(p)
  return texts(titleBlock(p, d, d.pages[1])).filter(
    (t) =>
      t.y === TITLE.project.addressBaseline ||
      t.y === TITLE.project.addressBaseline + TITLE.project.addressLineStep,
  )
}

describe('title-block address', () => {
  it('a first word wider than the first line moves everything to line 2', () => {
    const long = 'X'.repeat(40) + ' ĐÀ NẴNG'
    const lines = titleAddressTexts(long)
    expect(
      lines.some(
        (t) =>
          t.y === TITLE.project.addressBaseline &&
          t.x === TITLE.project.addressX,
      ),
    ).toBe(false)
    for (const t of lines) {
      const [x0, x1] = textSpan(t)
      expect(x0).toBeGreaterThanOrEqual(TITLE.left)
      expect(x1).toBeLessThanOrEqual(TITLE.right + EPS)
    }
  })

  it('a very long address stops at minSize with "…" on line 2, inside the block', () => {
    const lines = titleAddressTexts('SỐ 123 ĐƯỜNG BẠCH ĐẰNG, '.repeat(12))
    expect(lines.length).toBe(2)
    expect(lines[1].text.endsWith('…')).toBe(true)
    for (const t of lines) {
      expect(t.size).toBeGreaterThanOrEqual(TITLE.minSize - EPS)
      expect(textSpan(t)[1]).toBeLessThanOrEqual(TITLE.right + EPS)
    }
  })
})

describe('cover rows', () => {
  const rowTexts = (mutate: (p: ReturnType<typeof presetParams>) => void) => {
    const p = presetParams('house-5f')
    mutate(p)
    const d = derive(p)
    return texts(coverSheet(p, d)).filter((t) => t.x === COVER.rows.x)
  }

  it('an empty address still prints its label', () => {
    const rows = rowTexts((p) => {
      p.project.address = ''
    })
    expect(rows.some((t) => t.text === 'Địa chỉ/ Address : ')).toBe(true)
  })

  it('an overlong value reaches exactly COVER.minSize on at most 2 lines and stays inside', () => {
    const rows = rowTexts((p) => {
      p.project.name = 'TÊN RẤT DÀI '.repeat(80)
    })
    const name = rows.filter(
      (t) =>
        t.text.startsWith('Tên') ||
        Math.abs(t.y - COVER.rows.baselines[0]) < 15,
    )
    expect(name.length).toBeLessThanOrEqual(2)
    expect(name.every((t) => Math.abs(t.size - COVER.minSize) < EPS)).toBe(true)
    expect(name.at(-1)?.text.endsWith('…')).toBe(true)
    for (const t of name)
      expect(textSpan(t)[1]).toBeLessThanOrEqual(COVER.rows.right + EPS)
  })
})

describe('DTP 01 body scale', () => {
  const note = (n: number) =>
    Array.from(
      { length: n },
      (_, i) =>
        `${i + 1}. Ghi chú thêm số ${i + 1}: chủ đầu tư chuẩn bị mặt bằng tập kết vật tư và nguồn điện thi công tạm trước ngày lắp đặt.`,
    ).join('\n')

  it.each([5, 10, 15])(
    'a %i-line note that fits at some scale ≥ minScale is never cut',
    (n) => {
      const p = presetParams('house-5f')
      p.responsibility.note = note(n)
      const body = texts(responsibilitySheet(p)).filter(
        (t) => t.y >= RESPONSIBILITY.firstBaseline - EPS,
      )
      expect(body.some((t) => t.text.endsWith('…'))).toBe(false)
      expect(body.some((t) => t.text.startsWith(`${n}. Ghi chú`))).toBe(true)
      for (const t of body)
        expect(t.y).toBeLessThanOrEqual(RESPONSIBILITY.maxBaseline + EPS)
    },
  )
})

describe('DTP 02 unbreakable value', () => {
  it('one long word shrinks on one line inside the value cell', () => {
    const p = presetParams('house-5f')
    p.tech.modelCode = 'X'.repeat(90)
    const d = derive(p)
    const row = texts(specSheet(p, d)).filter((t) => t.text.startsWith('XXX'))
    expect(row.length).toBe(1)
    const [x0, x1] = textSpan(row[0])
    expect(x0).toBeGreaterThanOrEqual(SPEC.split)
    expect(x1).toBeLessThanOrEqual(SPEC.right + EPS)
    expect(row[0].size).toBeGreaterThanOrEqual(SPEC.minSize - EPS)
  })
})
