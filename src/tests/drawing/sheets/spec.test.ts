import { describe, expect, it } from 'vitest'

import { derive } from '#/domain/derive'
import { presetParams } from '#/domain/presets'
import type { ElevatorParams } from '#/domain/schema'
import { SHEET_AREA, SPEC, TITLE } from '#/drawing/frame/layout'
import { renderPage } from '#/drawing/pages'
import { powerRows, specRows } from '#/drawing/sheets/spec'
import { numbersOf, textSpan, texts } from '#/tests/drawing/helpers'

const clone = (id: 'house-5f' | 'hotel-9f') =>
  structuredClone<ElevatorParams>(presetParams(id))
const val = (p: ElevatorParams, label: string) =>
  specRows(p, derive(p)).find((r) => r.label === label)?.value

describe('specRows', () => {
  it('house-5f ra đúng chuỗi như PDF mẫu', () => {
    const p = presetParams('house-5f')
    const rows = specRows(p, derive(p))
    expect(rows.map((r) => r.value)).toEqual([
      'Tải khách không có phòng máy',
      'MRL - 550 - CO60 - 5/5',
      '550 Kg',
      'W 1500 (Rộng) x D 1900 (Sâu)',
      'W 1100 (Rộng) x D 1300 (Sâu) x H 2350 (Cao)',
      'W 700 x H 2100',
      '05 Stops',
      '60 m/phút',
      'FUJI - THAILAND ĐỒNG BỘ',
      '20.900 mm',
      '1400 / 4800 (3600 + 1200)',
    ])
  })

  it('nhãn dùng "KÍCH THƯỚC CABIN", không phải CARBIN', () => {
    const p = presetParams('house-5f')
    const labels = specRows(p, derive(p)).map((r) => r.label)
    expect(labels).toContain('KÍCH THƯỚC CABIN')
    expect(labels.join('|')).not.toContain('CARBIN')
  })

  it('thiếu chiều cao tầng thường -> "-- mm"', () => {
    const p = clone('house-5f')
    p.floors[1].height = null
    expect(val(p, 'TỔNG CHIỀU CAO HỐ')).toBe('-- mm')
  })

  it('machine hoặc controller rỗng: không có khoảng trắng thừa', () => {
    const p = clone('house-5f')
    p.tech.controller = ''
    expect(val(p, 'MÁY KÉO - TỦ ĐIỀU KHIỂN')).toBe('FUJI - THAILAND')
    p.tech.machine = ''
    p.tech.controller = 'ĐỒNG BỘ'
    expect(val(p, 'MÁY KÉO - TỦ ĐIỀU KHIỂN')).toBe('ĐỒNG BỘ')
    p.tech.machine = '  A '
    p.tech.controller = ' B  '
    expect(val(p, 'MÁY KÉO - TỦ ĐIỀU KHIỂN')).toBe('A B')
  })

  it('loại thang theo liftType của preset', () => {
    const p = presetParams('hotel-9f')
    const expected =
      p.tech.liftType === 'mrl'
        ? 'Tải khách không có phòng máy'
        : 'Tải khách có phòng máy'
    expect(val(p, 'LOẠI THANG')).toBe(expected)
    const q = clone('hotel-9f')
    q.tech.liftType = 'machine-room'
    expect(val(q, 'LOẠI THANG')).toBe('Tải khách có phòng máy')
  })

  it('hotel-9f thiếu chiều cao tầng -> "-- mm"', () => {
    const p = presetParams('hotel-9f')
    if (derive(p).shaftTotalHeight === null)
      expect(val(p, 'TỔNG CHIỀU CAO HỐ')).toBe('-- mm')
  })

  it('powerRows trả CHÍNH / ĐÈN', () => {
    const p = clone('house-5f')
    p.tech.mainPower = 'M'
    p.tech.lightPower = 'L'
    expect(powerRows(p)).toEqual([
      { label: 'CHÍNH', value: 'M' },
      { label: 'ĐÈN', value: 'L' },
    ])
  })
})

describe('renderPage spec', () => {
  it.each(['house-5f', 'hotel-9f'] as const)(
    '%s: số hữu hạn, chữ trong vùng vẽ, khung tên DTP 02',
    (id) => {
      const p = presetParams(id)
      const d = derive(p)
      const page = d.pages.find((x) => x.key === 'spec')!
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
      expect(all).toContain('02')
    },
  )

  it('machine/controller/mainPower 200 ký tự: nằm trong ô giá trị, tối đa 2 dòng', () => {
    const p = clone('house-5f')
    const long = 'Ơ'.repeat(5) + ' abc'.repeat(48)
    p.tech.machine = long.slice(0, 100)
    p.tech.controller = long.slice(0, 100)
    p.tech.mainPower = long.slice(0, 200)
    p.tech.lightPower = long.slice(0, 200)
    const d = derive(p)
    const page = d.pages.find((x) => x.key === 'spec')!
    const body = texts(renderPage(p, d, page)).filter(
      (t) => t.x > SPEC.split && t.x < TITLE.left && t.y > SPEC.titleBottom,
    )
    const rowIdx = (y: number) =>
      Math.floor((y - SPEC.titleBottom) / SPEC.rowHeight)
    const perRow = new Map<number, number>()
    for (const t of body) {
      const [a, b] = textSpan(t)
      expect(a, t.text).toBeGreaterThanOrEqual(SPEC.split - 1e-6)
      expect(b, t.text).toBeLessThanOrEqual(SPEC.right + 1e-6)
      expect(t.size, t.text).toBeGreaterThanOrEqual(SPEC.minSize - 1e-6)
      // baseline lies strictly between the row's two rules
      const i = rowIdx(t.y)
      const top = SPEC.titleBottom + i * SPEC.rowHeight
      expect(t.y).toBeGreaterThan(top)
      expect(t.y).toBeLessThan(top + SPEC.rowHeight)
      perRow.set(i, (perRow.get(i) ?? 0) + 1)
    }
    for (const [, n] of perRow) expect(n).toBeLessThanOrEqual(2)
    expect(perRow.size).toBeGreaterThan(0)
  })
})
