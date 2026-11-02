import { describe, expect, it } from 'vitest'

import { derive } from '#/domain/derive'
import { presetParams } from '#/domain/presets'
import { renderPage } from '#/drawing/pages'
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
})
