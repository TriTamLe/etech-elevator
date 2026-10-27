import { describe, expect, it } from 'vitest'

import { derive } from '#/domain/derive'
import { presetParams } from '#/domain/presets'
import { renderPage } from '#/drawing/pages'
import { texts } from '#/tests/drawing/helpers'

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
})
