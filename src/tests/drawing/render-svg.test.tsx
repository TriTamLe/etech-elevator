import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { derive } from '#/domain/derive'
import { presetParams } from '#/domain/presets'
import { renderPage } from '#/drawing/pages'
import { SheetSvg, arcPath } from '#/drawing/render-svg'
import type { ArcPrim, Prim } from '#/drawing/types'

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
          html.match(
            /<(line|rect|circle|polyline|polygon|path|text|image)[\s>]/g,
          ) ?? []
        expect(children.length).toBe(prims.length + 1)
      }
    },
  )
})

const arc = (start: number, end: number, r = 10): ArcPrim => ({
  kind: 'arc',
  c: { x: 100, y: 50 },
  r,
  start,
  end,
})

/** Tách "M x0 y0 A rx ry rot large sweep x1 y1" thành các số. */
function parseArc(d: string) {
  const m = d.match(/^M (\S+) (\S+) A (\S+) (\S+) 0 ([01]) ([01]) (\S+) (\S+)$/)
  if (!m) throw new Error(`arcPath sai dạng: ${d}`)
  const n = m.slice(1).map(Number)
  return {
    x0: n[0],
    y0: n[1],
    rx: n[2],
    ry: n[3],
    large: n[4],
    sweepFlag: n[5],
    x1: n[6],
    y1: n[7],
  }
}

describe('arcPath', () => {
  it('cung 0→90 (y hướng xuống): từ bên phải xuống dưới, large=0, sweep-flag=1', () => {
    const a = parseArc(arcPath(arc(0, 90)))
    expect(a.x0).toBeCloseTo(110, 9)
    expect(a.y0).toBeCloseTo(50, 9)
    expect(a.x1).toBeCloseTo(100, 9)
    expect(a.y1).toBeCloseTo(60, 9)
    expect([a.rx, a.ry, a.large, a.sweepFlag]).toEqual([10, 10, 0, 1])
  })

  it.each([
    [0, 179, 0],
    [0, 180, 0],
    [0, 180.01, 1],
    [0, 181, 1],
    [90, 359, 1],
    [270, 450, 0],
    [270, 450.5, 1],
    [359.33, 378.93, 0],
    [-30, 60, 0],
    [-30, 200, 1],
  ])('cung %s→%s: large-arc = %s (sweep > 180 mới là 1)', (s, e, large) => {
    expect(parseArc(arcPath(arc(s, e))).large).toBe(large)
  })

  it('end > 360 vẫn đúng điểm cuối (không bị vòng ngược)', () => {
    const a = parseArc(arcPath(arc(270, 450)))
    expect(a.x0).toBeCloseTo(100, 9)
    expect(a.y0).toBeCloseTo(40, 9)
    expect(a.x1).toBeCloseTo(100, 9)
    expect(a.y1).toBeCloseTo(60, 9)
  })

  it('đúng 180°: hai đầu đối xứng qua tâm, mọi số hữu hạn', () => {
    const d = arcPath(arc(90, 270))
    expect(d).not.toMatch(/NaN|Infinity/)
    const a = parseArc(d)
    expect((a.x0 + a.x1) / 2).toBeCloseTo(100, 9)
    expect((a.y0 + a.y1) / 2).toBeCloseTo(50, 9)
  })

  it('bán kính nhỏ / không nguyên: rx = ry = r', () => {
    const a = parseArc(arcPath(arc(0, 45, 0.5)))
    expect([a.rx, a.ry]).toEqual([0.5, 0.5])
  })
})

describe('arcPath: trọn vòng', () => {
  it('quét 360° vẽ thành 2 nửa cung (SVG bỏ cung có 2 đầu trùng nhau)', () => {
    const d = arcPath({
      kind: 'arc',
      c: { x: 10, y: 10 },
      r: 5,
      start: 30,
      end: 390,
    })
    expect(d.match(/ A /g)).toHaveLength(2)
    expect(d).not.toMatch(/NaN/)
  })
})

describe('SheetSvg: polyline / arc', () => {
  const render = (prims: Array<Prim>) =>
    renderToStaticMarkup(<SheetSvg prims={prims} label={null} />)
  const pts = [
    { x: 1, y: 2 },
    { x: 3.5, y: 4 },
    { x: 5, y: 0 },
  ]

  it('polyline hở → <polyline>, đóng → <polygon>, fill none', () => {
    const open = render([{ kind: 'polyline', pts }])
    expect(open).toContain('<polyline points="1,2 3.5,4 5,0"')
    expect(open).not.toContain('<polygon')
    const closed = render([{ kind: 'polyline', pts, closed: true }])
    expect(closed).toContain('<polygon points="1,2 3.5,4 5,0"')
    expect(closed).not.toContain('<polyline')
    expect(closed).toContain('fill="none"')
  })

  it('closed: false giống hở', () => {
    expect(render([{ kind: 'polyline', pts, closed: false }])).toContain(
      '<polyline',
    )
  })

  it('weight quyết định stroke-width, mặc định medium', () => {
    const thin = render([{ kind: 'polyline', pts, weight: 'thin' }])
    const dflt = render([{ kind: 'polyline', pts }])
    const w = (h: string) =>
      h.match(/<polyline[^>]*stroke-width="([^"]+)"/)?.[1]
    expect(w(thin)).toBeDefined()
    expect(w(dflt)).toBeDefined()
    expect(w(thin)).not.toBe(w(dflt))
  })

  it('arc → <path d=arcPath> fill none, không phần tử cấm', () => {
    const a = arc(0, 270)
    const html = render([a])
    expect(html).toContain(`<path d="${arcPath(a)}"`)
    expect(html).toContain('fill="none"')
    for (const bad of ['<pattern', '<use', '<foreignObject', 'filter'])
      expect(html).not.toContain(bad)
  })

  it('đếm phần tử khớp số Prim (+1 nền giấy), gồm polyline/arc', () => {
    const prims: Array<Prim> = [
      { kind: 'line', a: { x: 0, y: 0 }, b: { x: 1, y: 1 } },
      { kind: 'polyline', pts },
      { kind: 'polyline', pts, closed: true },
      arc(0, 90),
      { kind: 'circle', c: { x: 1, y: 1 }, r: 2 },
    ]
    const html = render(prims)
    const n =
      html.match(
        /<(line|rect|circle|polyline|polygon|path|text|image)[\s>]/g,
      ) ?? []
    expect(n.length).toBe(prims.length + 1)
  })
})
