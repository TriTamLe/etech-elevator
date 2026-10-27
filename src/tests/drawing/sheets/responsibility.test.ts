import { describe, expect, it } from 'vitest'

import { derive } from '#/domain/derive'
import { presetParams } from '#/domain/presets'
import type { ElevatorParams } from '#/domain/schema'
import { RESPONSIBILITY, SHEET_AREA, TITLE } from '#/drawing/frame/layout'
import { readyPages, renderPage } from '#/drawing/pages'
import {
  noteLines,
  responsibilityLines,
  responsibilitySheet,
} from '#/drawing/sheets/responsibility'
import { numbersOf, textSpan, texts } from '#/tests/drawing/helpers'

const clone = (id: 'house-5f' | 'hotel-9f' = 'house-5f') =>
  structuredClone<ElevatorParams>(presetParams(id))
const joined = (p: ElevatorParams) =>
  responsibilityLines(p)
    .map((l) => (l.kind === 'section' ? l.number + l.name : l.text))
    .join('\n')

describe('responsibilityLines', () => {
  it('chứa các số của nhóm F', () => {
    const p = clone()
    p.responsibility = {
      ...p.responsibility,
      widthTol: 25,
      plumbTol: 10,
      pitDrill: 100,
      breaker: '40 A',
      powerCable: '3 × 16 mm²',
      neutralCable: '1 × 10 mm²',
      spareLength: 2.5,
    }
    const s = joined(p)
    expect(s).toContain('+25mm')
    expect(s).toContain('10mm.')
    expect(s).toContain('100 mm')
    expect(s).toContain('40 A')
    expect(s).toContain('3 × 16 mm²')
    expect(s).toContain('1 × 10 mm²')
    expect(s).toContain('2,5m')
  })

  it('note rỗng -> 3 mục I/II/III', () => {
    const p = clone()
    p.responsibility.note = ''
    const secs = responsibilityLines(p).filter((l) => l.kind === 'section')
    expect(secs.map((l) => l.number)).toEqual(['I / ', 'II / ', 'III / '])
  })

  it('note nhiều dòng -> mục IV, bỏ dòng trống, CRLF ok', () => {
    const p = clone()
    p.responsibility.note = 'Một\r\n\r\n  Hai  \nBa\n'
    expect(noteLines(p)).toEqual(['Một', 'Hai', 'Ba'])
    const lines = responsibilityLines(p)
    const i = lines.findIndex(
      (l) => l.kind === 'section' && l.number === 'IV / ',
    )
    expect(i).toBeGreaterThan(0)
    expect(lines.slice(i + 1)).toEqual([
      { kind: 'item', text: 'Một' },
      { kind: 'item', text: 'Hai' },
      { kind: 'item', text: 'Ba' },
    ])
  })

  it('tiêu đề: có "TRÁCH NHIỆM", không có "TRÁCH NHIÊM"', () => {
    const t = texts(responsibilitySheet(clone()))
      .map((x) => x.text)
      .join('\n')
    expect(t).toContain('TRÁCH NHIỆM')
    expect(t).not.toContain('TRÁCH NHIÊM')
  })
})

describe('renderPage responsibility', () => {
  it.each(['house-5f', 'hotel-9f'] as const)(
    '%s: hữu hạn, trong vùng, DTP 01',
    (id) => {
      const p = presetParams(id)
      const d = derive(p)
      const page = d.pages.find((x) => x.key === 'responsibility')!
      const prims = renderPage(p, d, page)
      for (const pr of prims)
        for (const n of numbersOf(pr)) expect(Number.isFinite(n)).toBe(true)
      for (const t of texts(prims)) {
        if (t.x >= TITLE.left) continue
        const [a, b] = textSpan(t)
        expect(a, t.text).toBeGreaterThanOrEqual(SHEET_AREA.left - 1e-6)
        expect(b, t.text).toBeLessThanOrEqual(SHEET_AREA.right + 1e-6)
        expect(t.y, t.text).toBeLessThanOrEqual(SHEET_AREA.bottom)
      }
      const all = texts(prims).map((t) => t.text)
      expect(all).toContain('DTP')
      expect(all).toContain('01')
    },
  )

  const hard = (n: number, len: number) => {
    const p = clone()
    p.responsibility.note = Array.from(
      { length: n },
      (_, i) =>
        `${i + 1}. ` +
        'lorem ipsum đây là ghi chú dài '.repeat(8).slice(0, len),
    ).join('\n')
    return p
  }

  it.each([15, 60])('note %i dòng dài: mọi chữ trong vùng, không tràn', (n) => {
    const p = hard(n, 120)
    const d = derive(p)
    const page = d.pages.find((x) => x.key === 'responsibility')!
    const prims = renderPage(p, d, page)
    const body = texts(prims).filter(
      (t) => t.x < TITLE.left && t.y > RESPONSIBILITY.firstBaseline - 1e-6,
    )
    expect(body.length).toBeGreaterThan(20)
    for (const t of body) {
      const [a, b] = textSpan(t)
      expect(a, t.text).toBeGreaterThanOrEqual(SHEET_AREA.left - 1e-6)
      expect(b, t.text).toBeLessThanOrEqual(SHEET_AREA.right + 1e-6)
      expect(t.y, t.text).toBeLessThanOrEqual(RESPONSIBILITY.maxBaseline + 1e-6)
      expect(t.size, t.text).toBeGreaterThanOrEqual(
        RESPONSIBILITY.size * RESPONSIBILITY.minScale - 1e-6,
      )
    }
    if (n === 60) {
      const last = body.reduce((m, t) => (t.y > m.y ? t : m))
      expect(last.text.endsWith('…')).toBe(true)
    }
  })
})

describe('readyPages', () => {
  it.each(['house-5f', 'hotel-9f'] as const)(
    '%s: cover, responsibility, spec',
    (id) => {
      expect(
        readyPages(derive(presetParams(id)).pages).map((x) => x.key),
      ).toEqual(['cover', 'responsibility', 'spec'])
    },
  )
})
