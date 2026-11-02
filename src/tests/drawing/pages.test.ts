import { describe, expect, it } from 'vitest'

import { derive } from '#/domain/derive'
import { presetParams } from '#/domain/presets'
import { renderPage } from '#/drawing/pages'
import { LANDING_TITLE } from '#/drawing/sheets/landing-door'
import { numbersOf, texts } from '#/tests/drawing/helpers'

describe('renderPage', () => {
  it.each(['hotel-9f', 'house-5f'] as const)(
    '%s: cover không có khung tên, trang khác có',
    (id) => {
      const p = presetParams(id)
      const d = derive(p)
      for (const page of d.pages) {
        const t = texts(renderPage(p, d, page)).map((x) => x.text)
        if (page.key === 'cover') expect(t).not.toContain('LOẠI HỒ SƠ')
        else expect(t, page.key).toContain('LOẠI HỒ SƠ')
      }
    },
  )

  it.each(['hotel-9f', 'house-5f'] as const)(
    '%s: các trang hình (plan, pit, machine-room) có khung và hình, số hữu hạn',
    (id) => {
      const p = presetParams(id)
      const d = derive(p)
      for (const key of ['plan', 'pit', 'machine-room'] as const) {
        const page = d.pages.find((x) => x.key === key)!
        const out = renderPage(p, d, page)
        const t = texts(out).map((x) => x.text)
        expect(t, key).toContain('LOẠI HỒ SƠ')
        expect(t, key).toContain('Hướng cửa vào thang máy')
        for (const q of out)
          for (const n of numbersOf(q))
            expect(Number.isFinite(n), key).toBe(true)
      }
    },
  )

  // Ngưỡng rộng: chỉ bắt lỗi chậm bất thường (vẽ thử 1:1 rồi vẽ thật).
  it.each(['hotel-9f', 'house-5f'] as const)(
    '%s: mỗi trang hình vẽ dưới 500 ms',
    (id) => {
      const p = presetParams(id)
      const d = derive(p)
      for (const key of ['plan', 'pit', 'machine-room'] as const) {
        const page = d.pages.find((x) => x.key === key)!
        renderPage(p, d, page) // làm nóng
        const t0 = performance.now()
        renderPage(p, d, page)
        expect(performance.now() - t0, key).toBeLessThan(500)
      }
    },
  )

  it.each(['hotel-9f', 'house-5f'] as const)(
    '%s: 2 trang cửa tầng có hình (không còn là khung trống), số hữu hạn',
    (id) => {
      const p = presetParams(id)
      const d = derive(p)
      const empty = renderPage(
        p,
        d,
        d.pages.find((x) => x.key === 'section')!, // chưa vẽ: khung trống
      )
      for (const key of ['landing-wide', 'landing-narrow'] as const) {
        const page = d.pages.find((x) => x.key === key)!
        const out = renderPage(p, d, page)
        const t = texts(out).map((x) => x.text)
        expect(t, key).toContain('LOẠI HỒ SƠ')
        expect(t, key).toContain(LANDING_TITLE)
        expect(out.length, key).toBeGreaterThan(empty.length + 100)
        for (const q of out)
          for (const n of numbersOf(q))
            expect(Number.isFinite(n), key).toBe(true)
      }
    },
  )

  it.each(['hotel-9f', 'house-5f'] as const)(
    '%s: mỗi trang cửa tầng vẽ dưới 500 ms',
    (id) => {
      const p = presetParams(id)
      const d = derive(p)
      for (const key of ['landing-wide', 'landing-narrow'] as const) {
        const page = d.pages.find((x) => x.key === key)!
        renderPage(p, d, page) // làm nóng
        const t0 = performance.now()
        renderPage(p, d, page)
        expect(performance.now() - t0, key).toBeLessThan(500)
      }
    },
  )

  it('mọi tầng bao che hẹp: chỉ 1 trang cửa tầng (DTP 06), phòng máy dồn lên DTP 07', () => {
    const p = presetParams('house-5f')
    for (const f of p.floors) f.jamb = 'narrow'
    const d = derive(p)
    const keys = d.pages.map((x) => `${x.code}:${x.key}`)
    expect(keys).toEqual([
      ':cover',
      'DTP 01:responsibility',
      'DTP 02:spec',
      'DTP 03:plan',
      'DTP 04:pit',
      'DTP 05:section',
      'DTP 06:landing-narrow',
      'DTP 07:machine-room',
    ])
    const landing = d.pages.find((x) => x.key === 'landing-narrow')!
    const t = texts(renderPage(p, d, landing)).map((x) => x.text)
    expect(t).toContain('DTP')
    expect(t).toContain('06')
    expect(t).toContain('Tầng 1F ~ 5F : bao che hẹp')
  })

  it('house-5f: cửa tầng rộng DTP 06, hẹp DTP 07, phòng máy DTP 08', () => {
    const d = derive(presetParams('house-5f'))
    expect(d.pages.slice(-3).map((x) => `${x.code}:${x.key}`)).toEqual([
      'DTP 06:landing-wide',
      'DTP 07:landing-narrow',
      'DTP 08:machine-room',
    ])
  })
})
