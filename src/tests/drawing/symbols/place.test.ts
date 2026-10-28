import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'

import { SheetSvg } from '#/drawing/render-svg'
import { placeSymbol, placedBox, stretchedBox } from '#/drawing/symbols/place'
import type { SymbolData } from '#/drawing/symbols/types'
import type { ArcPrim, Prim } from '#/drawing/types'
import { pointsOf } from '#/tests/drawing/helpers'

// A hand-made "door": 800 × 2100 mm frame standing on its insertion point (bottom
// centre), a centre post, a quarter-arc handle and a knob. Stretch line at x = 0 (OP).
const DOOR: SymbolData = {
  id: 'test-door',
  label: 'Cửa thử',
  bbox: { x: -400, y: -2100, w: 800, h: 2100 },
  stretch: [
    { axis: 'x', at: 0, dir: 1 },
    { axis: 'y', at: -1000, dir: -1 },
  ],
  segs: [
    { t: 'l', p: [-400, 0, -400, -2100, 400, -2100, 400, 0], z: true },
    { t: 'l', p: [0, 0, 0, -2100] },
    { t: 'a', c: [300, -1000], r: 50, s: 0, e: 90 },
    { t: 'c', c: [-300, -1000], r: 20 },
  ],
}

function bounds(prims: Array<Prim>) {
  const pts = prims.flatMap(pointsOf)
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  return {
    x0: Math.min(...xs),
    y0: Math.min(...ys),
    x1: Math.max(...xs),
    y1: Math.max(...ys),
  }
}

const arcOf = (prims: Array<Prim>) =>
  prims.find((p): p is ArcPrim => p.kind === 'arc')

describe('placeSymbol', () => {
  it('scale 1:25: kích thước đúng, điểm chèn nằm tại `at`', () => {
    const prims = placeSymbol(DOOR, { at: { x: 100, y: 200 }, scale: 1 / 25 })
    const b = bounds(prims.filter((p) => p.kind === 'polyline'))
    expect(b.x1 - b.x0).toBeCloseTo(800 / 25, 9)
    expect(b.y1 - b.y0).toBeCloseTo(2100 / 25, 9)
    expect(b.y1).toBeCloseTo(200, 9)
    expect((b.x0 + b.x1) / 2).toBeCloseTo(100, 9)
    expect(prims.every((p) => p.kind !== 'line')).toBe(true)
  })

  it('mọi tọa độ hữu hạn, nét mặc định là thin', () => {
    const prims = placeSymbol(DOOR, {
      at: { x: 0, y: 0 },
      scale: 1 / 50,
      rotate: 270,
      mirrorX: true,
      stretch: { x: 123 },
    })
    for (const p of prims) {
      for (const [x, y] of pointsOf(p)) {
        expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true)
      }
      expect('weight' in p && p.weight).toBe('thin')
    }
  })

  it('kéo giãn +200: rộng thêm đúng 200 × scale, nửa trái giữ nguyên', () => {
    const o = { at: { x: 0, y: 0 }, scale: 1 / 20 }
    const base = bounds(placeSymbol(DOOR, o))
    const wide = placeSymbol(DOOR, { ...o, stretch: { x: 200 } })
    const b = bounds(wide.filter((p) => p.kind === 'polyline'))
    expect(b.x0).toBeCloseTo(-400 / 20, 9)
    expect(b.x1).toBeCloseTo((400 + 200) / 20, 9)
    expect(b.y1 - b.y0).toBeCloseTo(base.y1 - base.y0, 9)
    // The post sits on the stretch line (not past it): it stays put.
    const post = wide[1]
    expect(post.kind === 'polyline' && post.pts[0].x).toBeCloseTo(0, 9)
    // Arc and circle move rigidly with their centre.
    expect(arcOf(wide)?.c.x).toBeCloseTo((300 + 200) / 20, 9)
    const knob = wide.find((p) => p.kind === 'circle')
    expect(knob?.kind === 'circle' && knob.c.x).toBeCloseTo(-300 / 20, 9)
  })

  it('xoay 90°: bbox đổi chiều, góc cung cộng 90', () => {
    const prims = placeSymbol(DOOR, {
      at: { x: 0, y: 0 },
      scale: 1,
      rotate: 90,
    })
    const b = bounds(prims.filter((p) => p.kind === 'polyline'))
    expect(b.x1 - b.x0).toBeCloseTo(2100, 9)
    expect(b.y1 - b.y0).toBeCloseTo(800, 9)
    // (x, y) → (−y, x): the door now lies to the right of the insertion point.
    expect(b.x0).toBeCloseTo(0, 9)
    const arc = arcOf(prims)
    expect(arc?.start).toBeCloseTo(90, 9)
    expect(arc?.end).toBeCloseTo(180, 9)
    expect(arc?.c.x).toBeCloseTo(1000, 9)
    expect(arc?.c.y).toBeCloseTo(300, 9)
  })

  it('lật trái phải: cung đổi chiều nhưng góc vẫn tăng dần', () => {
    const arc = arcOf(
      placeSymbol(DOOR, { at: { x: 0, y: 0 }, scale: 1, mirrorX: true }),
    )
    expect(arc?.c.x).toBeCloseTo(-300, 9)
    expect(arc?.start).toBeCloseTo(90, 9)
    expect(arc?.end).toBeCloseTo(180, 9)
  })
})

describe('kéo giãn chiều cao (dir −1)', () => {
  it('HH +300: đỉnh đi lên, đáy và điểm chèn đứng yên', () => {
    const o = { at: { x: 0, y: 0 }, scale: 1 }
    const tall = placeSymbol(DOOR, { ...o, stretch: { y: 300 } })
    const b = bounds(tall.filter((p) => p.kind === 'polyline'))
    expect(b.y1).toBeCloseTo(0, 9)
    expect(b.y0).toBeCloseTo(-2400, 9)
    // The handle (y −1000, on the line) and the knob stay; nothing goes below 0.
    expect(arcOf(tall)?.c.y).toBeCloseTo(-1000, 9)
    expect(stretchedBox(DOOR, { y: 300 })).toEqual({
      x: -400,
      y: -2400,
      w: 800,
      h: 2400,
    })
  })
})

describe('stretchedBox / placedBox', () => {
  it('bbox kéo giãn và bbox trên trang khớp với nét vẽ', () => {
    expect(stretchedBox(DOOR, { x: 200 })).toEqual({
      x: -400,
      y: -2100,
      w: 1000,
      h: 2100,
    })
    const o = {
      at: { x: 50, y: 60 },
      scale: 1 / 25,
      rotate: 90 as const,
      stretch: { x: 200 },
    }
    const box = placedBox(DOOR, o)
    const b = bounds(placeSymbol(DOOR, o).filter((p) => p.kind === 'polyline'))
    expect(box.x).toBeCloseTo(b.x0, 9)
    expect(box.y).toBeCloseTo(b.y0, 9)
    expect(box.w).toBeCloseTo(b.x1 - b.x0, 9)
    expect(box.h).toBeCloseTo(b.y1 - b.y0, 9)
  })
})

describe('render', () => {
  it('polyline/polygon và cung ra <path> có lệnh A', () => {
    const prims = placeSymbol(DOOR, { at: { x: 210, y: 250 }, scale: 1 / 25 })
    const html = renderToStaticMarkup(
      createElement(SheetSvg, { prims, label: null }),
    )
    expect(html).toContain('<polygon')
    expect(html).toContain('<polyline')
    expect(html).toMatch(/<path d="M [\d.]+ [\d.]+ A 2 2 0 0 1 [\d.]+ [\d.]+"/)
    expect(html).toContain('<circle')
    for (const bad of ['<use', '<pattern', '<foreignObject']) {
      expect(html).not.toContain(bad)
    }
  })
})

// ---- Biên bổ sung ----------------------------------------------------------

type Turn = 0 | 90 | 180 | 270
const TURNS: Array<Turn> = [0, 90, 180, 270]
const rad = (d: number) => (d * Math.PI) / 180

/** Độc lập với place.ts: lật → xoay (x,y)→(−y,x) → scale → dời. */
function ref(
  [x, y]: [number, number],
  o: {
    at: { x: number; y: number }
    scale: number
    rotate: Turn
    mirrorX: boolean
  },
): [number, number] {
  if (o.mirrorX) x = -x
  for (let i = 0; i < o.rotate / 90; i++) [x, y] = [-y, x]
  return [o.at.x + x * o.scale, o.at.y + y * o.scale]
}

const onArc = (a: ArcPrim, deg: number): [number, number] => [
  a.c.x + a.r * Math.cos(rad(deg)),
  a.c.y + a.r * Math.sin(rad(deg)),
]

describe('placeSymbol: lật + xoay với cung', () => {
  const ARC_SYM = (s: number, e: number): SymbolData => ({
    id: 't',
    label: 't',
    bbox: { x: -100, y: -100, w: 200, h: 200 },
    stretch: [],
    segs: [{ t: 'a', c: [30, -40], r: 20, s, e }],
  })

  // Mọi tổ hợp lật × xoay, vài kiểu cung (nhỏ, đúng 180, lớn, vượt 360, âm).
  const ARCS: Array<[number, number]> = [
    [0, 90],
    [30, 120],
    [10, 190],
    [270, 450],
    [-30, 60],
    [350, 380],
  ]

  it.each(
    TURNS.flatMap((rotate) =>
      [false, true].flatMap((mirrorX) =>
        ARCS.map(([s, e]) => ({ rotate, mirrorX, s, e })),
      ),
    ),
  )(
    'rotate $rotate mirror $mirrorX cung $s→$e: đầu/cuối/giữa khớp phép biến đổi điểm',
    ({ rotate, mirrorX, s, e }) => {
      const o = { at: { x: 11, y: 7 }, scale: 0.5, rotate, mirrorX }
      const sym = ARC_SYM(s, e)
      const arc = arcOf(placeSymbol(sym, o))!
      expect(arc.r).toBeCloseTo(10, 9)
      // Góc tăng dần, độ quét giữ nguyên.
      expect(arc.end - arc.start).toBeCloseTo(e - s, 9)
      expect(arc.start).toBeGreaterThanOrEqual(0)
      expect(arc.start).toBeLessThan(360)
      // Điểm trên cung (đầu, giữa, cuối) = điểm gốc đi qua cùng phép biến đổi.
      const src: ArcPrim = {
        kind: 'arc',
        c: { x: 30, y: -40 },
        r: 20,
        start: s,
        end: e,
      }
      for (const t of [0, 0.5, 1]) {
        const want = ref(onArc(src, s + (e - s) * t), o)
        // Lật đảo chiều quay: điểm đầu của cung gốc thành điểm cuối của cung mới.
        const u = mirrorX ? 1 - t : t
        const got = onArc(arc, arc.start + (arc.end - arc.start) * u)
        expect(got[0]).toBeCloseTo(want[0], 6)
        expect(got[1]).toBeCloseTo(want[1], 6)
      }
    },
  )

  it('xoay 180: cung 0→90 thành 180→270, tâm đối xứng', () => {
    const arc = arcOf(
      placeSymbol(DOOR, { at: { x: 0, y: 0 }, scale: 1, rotate: 180 }),
    )!
    expect(arc.start).toBeCloseTo(180, 9)
    expect(arc.end).toBeCloseTo(270, 9)
    expect(arc.c.x).toBeCloseTo(-300, 9)
    expect(arc.c.y).toBeCloseTo(1000, 9)
  })

  it('xoay 270: cung 0→90 thành 270→360 (không vòng qua 0)', () => {
    const arc = arcOf(
      placeSymbol(DOOR, { at: { x: 0, y: 0 }, scale: 1, rotate: 270 }),
    )!
    expect(arc.start).toBeCloseTo(270, 9)
    expect(arc.end).toBeCloseTo(360, 9)
    expect(arc.c.x).toBeCloseTo(-1000, 9)
    expect(arc.c.y).toBeCloseTo(-300, 9)
  })

  it('lật + xoay 90 trên cung 0→90: 180→270', () => {
    const arc = arcOf(
      placeSymbol(DOOR, {
        at: { x: 0, y: 0 },
        scale: 1,
        mirrorX: true,
        rotate: 90,
      }),
    )!
    expect(arc.start).toBeCloseTo(180, 9)
    expect(arc.end).toBeCloseTo(270, 9)
  })

  it('bán kính cung/tròn nhân scale; đa tuyến đóng giữ cờ closed', () => {
    const prims = placeSymbol(DOOR, { at: { x: 0, y: 0 }, scale: 0.1 })
    expect(arcOf(prims)?.r).toBeCloseTo(5, 9)
    const circle = prims.find((p) => p.kind === 'circle')
    expect(circle?.kind === 'circle' && circle.r).toBeCloseTo(2, 9)
    expect(prims[0].kind === 'polyline' && prims[0].closed).toBe(true)
    expect(prims[1].kind === 'polyline' && prims[1].closed).toBeFalsy()
  })

  it('weight truyền xuống mọi nét', () => {
    const prims = placeSymbol(DOOR, {
      at: { x: 0, y: 0 },
      scale: 1,
      weight: 'thick',
    })
    for (const p of prims) expect('weight' in p && p.weight).toBe('thick')
  })

  it('rotate không truyền = 0, không đổi input (hàm thuần)', () => {
    const before = JSON.stringify(DOOR)
    const a = placeSymbol(DOOR, { at: { x: 5, y: 5 }, scale: 2 })
    const b = placeSymbol(DOOR, { at: { x: 5, y: 5 }, scale: 2, rotate: 0 })
    expect(a).toEqual(b)
    expect(JSON.stringify(DOOR)).toBe(before)
  })
})

describe('placeSymbol: kéo giãn biên', () => {
  const o = { at: { x: 0, y: 0 }, scale: 1 }

  it('stretch 0 / thiếu / sai trục = không đổi', () => {
    const base = placeSymbol(DOOR, o)
    expect(placeSymbol(DOOR, { ...o, stretch: {} })).toEqual(base)
    expect(placeSymbol(DOOR, { ...o, stretch: { x: 0, y: 0 } })).toEqual(base)
    const noX: SymbolData = { ...DOOR, stretch: [DOOR.stretch[1]] }
    expect(placeSymbol(noX, { ...o, stretch: { x: 500 } })).toEqual(
      placeSymbol(noX, o),
    )
  })

  it('stretch âm: thu nhỏ đúng |d|, điểm trên đường cắt đứng yên', () => {
    const shrunk = placeSymbol(DOOR, { ...o, stretch: { x: -100 } })
    const b = bounds(shrunk.filter((p) => p.kind === 'polyline'))
    expect(b.x0).toBeCloseTo(-400, 9)
    expect(b.x1).toBeCloseTo(300, 9)
    expect(arcOf(shrunk)?.c.x).toBeCloseTo(200, 9)
    expect(stretchedBox(DOOR, { x: -100 }).w).toBe(700)
    // Chiều cao (dir −1): thu 100 → đỉnh hạ xuống −2000.
    const h = placeSymbol(DOOR, { ...o, stretch: { y: -100 } })
    expect(bounds(h.filter((p) => p.kind === 'polyline')).y0).toBeCloseTo(
      -2000,
      9,
    )
    expect(stretchedBox(DOOR, { y: -100 })).toEqual({
      x: -400,
      y: -2000,
      w: 800,
      h: 2000,
    })
  })

  it('kéo cả hai trục cùng lúc: độc lập nhau', () => {
    const both = stretchedBox(DOOR, { x: 200, y: 300 })
    expect(both).toEqual({ x: -400, y: -2400, w: 1000, h: 2400 })
    const b = bounds(
      placeSymbol(DOOR, { ...o, stretch: { x: 200, y: 300 } }).filter(
        (p) => p.kind === 'polyline',
      ),
    )
    expect(b.x1 - b.x0).toBeCloseTo(1000, 9)
    expect(b.y1 - b.y0).toBeCloseTo(2400, 9)
  })

  it('điểm đúng trên đường cắt (coord = at) không dịch', () => {
    const sym: SymbolData = {
      id: 't',
      label: 't',
      bbox: { x: -10, y: -10, w: 30, h: 20 },
      stretch: [{ axis: 'x', at: 0, dir: 1 }],
      segs: [{ t: 'l', p: [0, 0, 10, 0, -10, 0] }],
    }
    const [p] = placeSymbol(sym, { ...o, stretch: { x: 50 } })
    expect(p.kind === 'polyline' && p.pts.map((q) => q.x)).toEqual([0, 60, -10])
  })

  it('đường cắt dir −1 trên trục x: nửa trái dịch sang trái', () => {
    const sym: SymbolData = {
      id: 't',
      label: 't',
      bbox: { x: -100, y: 0, w: 200, h: 10 },
      stretch: [{ axis: 'x', at: 0, dir: -1 }],
      segs: [{ t: 'l', p: [-100, 0, 0, 0, 100, 0] }],
    }
    const [p] = placeSymbol(sym, { ...o, stretch: { x: 40 } })
    expect(p.kind === 'polyline' && p.pts.map((q) => q.x)).toEqual([
      -140, 0, 100,
    ])
    expect(stretchedBox(sym, { x: 40 })).toEqual({
      x: -140,
      y: 0,
      w: 240,
      h: 10,
    })
  })

  it('kéo giãn xảy ra trước lật/xoay (theo hệ tọa độ ký hiệu)', () => {
    // Lật: nửa phải của ký hiệu (được kéo) nằm bên trái trên trang.
    const prims = placeSymbol(DOOR, {
      ...o,
      mirrorX: true,
      stretch: { x: 200 },
    })
    const b = bounds(prims.filter((p) => p.kind === 'polyline'))
    expect(b.x0).toBeCloseTo(-600, 9)
    expect(b.x1).toBeCloseTo(400, 9)
  })
})

describe('stretchedBox: đường cắt ngoài / sát mép bbox', () => {
  const box = { x: 0, y: 0, w: 100, h: 50 }
  const sym = (axis: 'x' | 'y', at: number, dir: 1 | -1): SymbolData => ({
    id: 't',
    label: 't',
    bbox: box,
    stretch: [{ axis, at, dir }],
    segs: [{ t: 'l', p: [0, 0, 100, 50] }],
  })

  it('đường cắt phía trước hộp, dir +1: cả hộp chỉ dời +d', () => {
    expect(stretchedBox(sym('x', -20, 1), { x: 30 })).toEqual({
      x: 30,
      y: 0,
      w: 100,
      h: 50,
    })
    expect(stretchedBox(sym('y', -20, 1), { y: 30 })).toEqual({
      x: 0,
      y: 30,
      w: 100,
      h: 50,
    })
  })

  it('đường cắt phía sau hộp, dir −1: cả hộp chỉ dời −d', () => {
    expect(stretchedBox(sym('x', 150, -1), { x: 30 })).toEqual({
      x: -30,
      y: 0,
      w: 100,
      h: 50,
    })
  })

  it('đường cắt không chạm vùng dịch chuyển: hộp giữ nguyên', () => {
    expect(stretchedBox(sym('x', 150, 1), { x: 30 })).toEqual(box)
    expect(stretchedBox(sym('x', -20, -1), { x: 30 })).toEqual(box)
    expect(stretchedBox(sym('y', 80, 1), { y: 30 })).toEqual(box)
  })

  it('đường cắt sát mép hộp', () => {
    // at = mép phải, dir +1: không điểm nào > at → không đổi.
    expect(stretchedBox(sym('x', 100, 1), { x: 30 })).toEqual(box)
    // at = mép trái, dir +1: cả hộp nằm bên dịch → giãn ra hay chỉ dời đều cho cùng điểm cuối phải.
    const r = stretchedBox(sym('x', 0, 1), { x: 30 })
    expect(r.x + r.w).toBe(130)
  })

  it('khớp với nét vẽ thật khi đường cắt ngoài bbox', () => {
    for (const [axis, at, dir] of [
      ['x', -20, 1],
      ['x', 150, -1],
      ['y', -20, 1],
      ['y', 80, -1],
      ['x', 150, 1],
    ] as const) {
      const s = sym(axis, at, dir)
      const by = { [axis]: 30 }
      const sb = stretchedBox(s, by)
      const b = bounds(
        placeSymbol(s, { at: { x: 0, y: 0 }, scale: 1, stretch: by }),
      )
      expect(
        [sb.x, sb.y, sb.x + sb.w, sb.y + sb.h],
        `${axis} ${at} ${dir}`,
      ).toEqual([b.x0, b.y0, b.x1, b.y1])
    }
  })
})

describe('placedBox', () => {
  it('lật trái phải: hộp phản chiếu qua điểm chèn', () => {
    const o = { at: { x: 100, y: 100 }, scale: 1 }
    const plain = placedBox(DOOR, { ...o, stretch: { x: 200 } })
    const flipped = placedBox(DOOR, {
      ...o,
      stretch: { x: 200 },
      mirrorX: true,
    })
    expect(plain.x).toBeCloseTo(100 - 400, 9)
    expect(plain.w).toBeCloseTo(1000, 9)
    expect(flipped.x).toBeCloseTo(100 - 600, 9)
    expect(flipped.w).toBeCloseTo(1000, 9)
    expect(flipped.y).toBeCloseTo(plain.y, 9)
    expect(flipped.h).toBeCloseTo(plain.h, 9)
  })

  it.each(
    TURNS.flatMap((rotate) =>
      [false, true].map((mirrorX) => ({ rotate, mirrorX })),
    ),
  )(
    'rotate $rotate mirror $mirrorX: w/h dương và khớp đa tuyến',
    ({ rotate, mirrorX }) => {
      const o = {
        at: { x: 210, y: 150 },
        scale: 1 / 25,
        rotate,
        mirrorX,
        stretch: { x: 150, y: -200 },
      }
      const box = placedBox(DOOR, o)
      expect(box.w).toBeGreaterThan(0)
      expect(box.h).toBeGreaterThan(0)
      const b = bounds(
        placeSymbol(DOOR, o).filter((p) => p.kind === 'polyline'),
      )
      expect(box.x).toBeCloseTo(b.x0, 9)
      expect(box.y).toBeCloseTo(b.y0, 9)
      expect(box.x + box.w).toBeCloseTo(b.x1, 9)
      expect(box.y + box.h).toBeCloseTo(b.y1, 9)
      // Kéo x +150 → rộng 950; y −200 (âm, thu nhỏ) → cao 1900.
      const swapped = rotate === 90 || rotate === 270
      expect(box.w).toBeCloseTo((swapped ? 1900 : 950) / 25, 9)
      expect(box.h).toBeCloseTo((swapped ? 950 : 1900) / 25, 9)
    },
  )
})

describe('cung kéo giãn theo nét, không theo tâm', () => {
  // A shallow arc whose stroke (y ≈ −650) sits on the fixed side of the stretch line at
  // y = −1500 (dir −1 moves the upper part), but whose centre (y −1510) sits on the
  // moving side — the car-side case.
  const SHALLOW: SymbolData = {
    id: 'test-shallow-arc',
    label: 'Cung thử',
    bbox: { x: -400, y: -2000, w: 800, h: 2000 },
    stretch: [{ axis: 'y', at: -1500, dir: -1 }],
    segs: [
      { t: 'l', p: [-400, 0, -400, -2000] },
      { t: 'a', c: [-293.12, -1510.01], r: 867.54, s: 84.14, e: 90.46 },
      { t: 'a', c: [0, -1800], r: 100, s: 0, e: 180 },
    ],
  }

  it('cung có nét ở phía đứng yên không bị dời, dù tâm ở phía bị dời', () => {
    const o = { at: { x: 0, y: 0 }, scale: 1 }
    const arcs = (prims: Array<Prim>) =>
      prims.filter((p): p is ArcPrim => p.kind === 'arc')
    const base = arcs(placeSymbol(SHALLOW, o))
    const tall = arcs(placeSymbol(SHALLOW, { ...o, stretch: { y: 300 } }))
    expect(tall[0].c.y).toBeCloseTo(base[0].c.y, 9)
    // An arc wholly above the line moves up with the stretch.
    expect(tall[1].c.y).toBeCloseTo(base[1].c.y - 300, 9)
  })
})
