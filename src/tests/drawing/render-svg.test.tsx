import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { derive } from '#/domain/derive'
import { presetParams } from '#/domain/presets'
import { renderPage } from '#/drawing/pages'
import { SheetSvg } from '#/drawing/render-svg'

describe('SheetSvg', () => {
  it.each(['hotel-9f', 'house-5f'] as const)(
    '%s: viewBox đúng, không phần tử cấm, đủ phần tử',
    (id) => {
      const p = presetParams(id)
      const d = derive(p)
      for (const page of d.pages) {
        const prims = renderPage(p, d, page)
        const html = renderToStaticMarkup(
          <SheetSvg prims={prims} label={page.title} />,
        )
        expect(html).toContain('viewBox="0 0 420 297"')
        for (const bad of ['<pattern', '<use', '<foreignObject', 'filter'])
          expect(html).not.toContain(bad)
        const children =
          html.match(/<(line|rect|circle|text|image)[\s>]/g) ?? []
        expect(children.length).toBe(prims.length + 1)
      }
    },
  )
})
