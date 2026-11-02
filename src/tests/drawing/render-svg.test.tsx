import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { derive } from '#/domain/derive'
import { presetParams } from '#/domain/presets'
import { renderPage } from '#/drawing/pages'
import { dim, dimStyle } from '#/drawing/primitives'
import { hatch } from '#/drawing/primitives/hatch'
import { view } from '#/drawing/primitives/view'
import { SheetSvg, arcPath, linesPath } from '#/drawing/render-svg'
import { STROKE } from '#/drawing/types'
import type { ArcPrim, LinesPrim, Prim } from '#/drawing/types'

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

const renderPrims = (prims: Array<Prim>) =>
  renderToStaticMarkup(<SheetSvg prims={prims} label={null} />)

describe('SheetSvg: chữ xoay', () => {
  const t = (rotate?: number): Prim => ({
    kind: 'text',
    x: 12.5,
    y: 40,
    text: '1500',
    size: 3,
    anchor: 'middle',
    rotate,
  })

  it('rotate −90 → transform="rotate(-90 x y)" quanh điểm neo', () => {
    expect(renderPrims([t(-90)])).toContain('transform="rotate(-90 12.5 40)"')
  })

  it('rotate khác: giữ nguyên góc và dấu', () => {
    expect(renderPrims([t(90)])).toContain('transform="rotate(90 12.5 40)"')
    expect(renderPrims([t(-45.5)])).toContain(
      'transform="rotate(-45.5 12.5 40)"',
    )
  })

  it('không rotate hoặc rotate 0 → không có thuộc tính transform trên <text>', () => {
    for (const r of [undefined, 0]) {
      const html = renderPrims([t(r)])
      const el = html.match(/<text[^>]*>/)![0]
      expect(el).not.toContain('transform')
    }
  })

  it('chữ xoay vẫn giữ nội dung, text-anchor và cỡ chữ', () => {
    const html = renderPrims([t(-90)])
    expect(html).toContain('>1500</text>')
    expect(html).toContain('text-anchor="middle"')
    expect(html).toContain('font-size="3"')
  })

  it('kích thước đứng (dim dir "v") ra <text> xoay −90', () => {
    const prims = dim(
      view(50, { x: 100, y: 100 }),
      { x: 0, y: 0 },
      { x: 0, y: 1500 },
      { dir: 'v', offset: -10, style: dimStyle(3) },
    )
    const html = renderPrims(prims)
    expect(html).toMatch(/<text[^>]*transform="rotate\(-90 [\d.]+ [\d.]+\)"/)
    expect(html).toContain('>1500</text>')
  })
})

describe('SheetSvg: polyline tô đặc', () => {
  const pts = [
    { x: 0, y: 0 },
    { x: 4, y: 1 },
    { x: 4, y: -1 },
  ]

  it("fill: 'ink' trên polyline đóng → <polygon> fill đen", () => {
    const html = renderPrims([
      { kind: 'polyline', pts, closed: true, fill: 'ink' },
    ])
    expect(html).toMatch(/<polygon[^>]*fill="#000"/)
  })

  it("fill: 'ink' trên polyline hở → <polyline> fill đen", () => {
    const html = renderPrims([{ kind: 'polyline', pts, fill: 'ink' }])
    expect(html).toMatch(/<polyline[^>]*fill="#000"/)
  })

  it('fill \'none\' hoặc bỏ trống → fill="none"', () => {
    for (const fill of [undefined, 'none'] as const) {
      const html = renderPrims([{ kind: 'polyline', pts, closed: true, fill }])
      expect(html).toMatch(/<polygon[^>]*fill="none"/)
      expect(html).not.toMatch(/<polygon[^>]*fill="#000"/)
    }
  })

  it('mũi tên của dim (fill ink) ra polygon đen, số lượng khớp', () => {
    const prims = dim(
      view(50, { x: 100, y: 100 }),
      { x: 0, y: 0 },
      { x: 1500, y: 0 },
      { dir: 'h', offset: -10, style: dimStyle(3) },
    )
    const html = renderPrims(prims)
    expect(html.match(/<polygon[^>]*fill="#000"/g)).toHaveLength(2)
  })
})

describe('linesPath', () => {
  const l = (segs: Array<number>): LinesPrim => ({ kind: 'lines', segs })

  it('mỗi đoạn là "M x1 y1 L x2 y2", nối liền không dấu cách thừa', () => {
    expect(linesPath(l([1, 2, 3, 4, 5, 6, 7, 8]))).toBe('M1 2L3 4M5 6L7 8')
  })

  it('không có đoạn nào → chuỗi rỗng', () => {
    expect(linesPath(l([]))).toBe('')
  })

  it('đoạn dài 0 được nối dài 0,02 theo x để vẽ thành chấm', () => {
    expect(linesPath(l([1, 2, 1, 2]))).toBe('M1 2L1.02 2')
    expect(linesPath(l([10.1, 5, 10.1, 5]))).toBe('M10.1 5L10.12 5')
  })

  it('đoạn đứng (x bằng nhau, y khác) KHÔNG bị nối dài', () => {
    expect(linesPath(l([3, 1, 3, 9]))).toBe('M3 1L3 9')
  })

  it('đoạn ngang (y bằng nhau, x khác) giữ nguyên', () => {
    expect(linesPath(l([1, 5, 9, 5]))).toBe('M1 5L9 5')
  })

  it('số làm tròn 0,01 mm', () => {
    expect(linesPath(l([1.234, 2.005, 3.456, 4.999]))).toBe('M1.23 2.01L3.46 5')
    expect(linesPath(l([0.004, -0.004, 1.2, 3.1]))).toBe('M0 0L1.2 3.1')
  })

  it('số âm giữ dấu âm', () => {
    expect(linesPath(l([-1.5, -2.25, -3, -4]))).toBe('M-1.5 -2.25L-3 -4')
  })

  it('số thừa cuối mảng (không đủ 4) bị bỏ qua', () => {
    expect(linesPath(l([1, 2, 3, 4, 5, 6]))).toBe('M1 2L3 4')
    expect(linesPath(l([1, 2, 3]))).toBe('')
  })

  it('dữ liệu hatch thật: số lệnh M = số đoạn, không NaN, đúng dạng M..L..', () => {
    const prims = hatch(
      view(20, { x: 50, y: 40 }),
      [
        [
          { x: 0, y: 0 },
          { x: 1000, y: 0 },
          { x: 1000, y: 500 },
          { x: 0, y: 500 },
        ],
      ],
      'AR-CONC',
      { scale: 20 },
    )
    const lines = prims[0] as LinesPrim
    const d = linesPath(lines)
    expect(d).not.toMatch(/NaN|Infinity/)
    expect(d.match(/M/g)).toHaveLength(lines.segs.length / 4)
    expect(d.match(/L/g)).toHaveLength(lines.segs.length / 4)
    expect(d).toMatch(/^(M-?[\d.]+ -?[\d.]+L-?[\d.]+ -?[\d.]+)+$/)
  })
})

describe('SheetSvg: prim lines', () => {
  const segs = [10, 10, 20, 20, 30, 30, 30, 30, 40, 5, 50, 5]
  const prim: LinesPrim = { kind: 'lines', segs, weight: 'thin' }

  it('một prim `lines` → đúng một <path> với d = linesPath', () => {
    const html = renderPrims([prim])
    expect(html).toContain(`<path d="${linesPath(prim)}"`)
    expect(html.match(/<path /g)).toHaveLength(1)
  })

  it('d có dạng M..L..M..L.., đoạn chấm (30,30) đã nối dài', () => {
    const d = html2d(renderPrims([prim]))
    expect(d).toBe('M10 10L20 20M30 30L30.02 30M40 5L50 5')
  })

  it('fill none, stroke đen, đầu nét tròn, độ dày theo weight', () => {
    const html = renderPrims([prim])
    const el = html.match(/<path[^>]*>/)![0]
    expect(el).toContain('fill="none"')
    expect(el).toContain('stroke="#000"')
    expect(el).toContain('stroke-linecap="round"')
    expect(el).toContain(`stroke-width="${STROKE.thin}"`)
  })

  it('weight mặc định là medium', () => {
    const html = renderPrims([{ kind: 'lines', segs }])
    expect(html).toContain(`stroke-width="${STROKE.medium}"`)
  })

  it('hàng nghìn đoạn vẫn chỉ là một <path>; không phần tử cấm', () => {
    const many: Array<number> = []
    for (let i = 0; i < 4000; i++) many.push(i % 400, 10, (i % 400) + 1, 20)
    const html = renderPrims([{ kind: 'lines', segs: many }])
    expect(html.match(/<path /g)).toHaveLength(1)
    for (const bad of [
      '<pattern',
      '<use',
      '<foreignObject',
      'filter',
      'clipPath',
    ])
      expect(html).not.toContain(bad)
  })

  it('đếm phần tử khớp số Prim (+1 nền giấy) khi trộn lines với prim khác', () => {
    const prims: Array<Prim> = [
      prim,
      { kind: 'line', a: { x: 0, y: 0 }, b: { x: 1, y: 1 } },
      { kind: 'text', x: 1, y: 1, text: 'a', size: 3, rotate: -90 },
      {
        kind: 'polyline',
        pts: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
          { x: 2, y: 0 },
        ],
        closed: true,
        fill: 'ink',
      },
    ]
    const n =
      renderPrims(prims).match(
        /<(line|rect|circle|polyline|polygon|path|text|image)[\s>]/g,
      ) ?? []
    expect(n.length).toBe(prims.length + 1)
  })
})

/** Lấy thuộc tính d của <path> đầu tiên trong chuỗi SVG. */
function html2d(html: string): string {
  const m = html.match(/<path d="([^"]*)"/)
  if (!m) throw new Error('không có <path>')
  return m[1]
}
