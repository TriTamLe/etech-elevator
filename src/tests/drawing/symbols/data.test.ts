import { describe, expect, it } from 'vitest'

import { SYMBOL_IDS, placeSymbol, placedBox, symbol } from '#/drawing/symbols'
import type { Seg } from '#/drawing/symbols/types'

// The generated library (yarn gen:symbols): sane geometry, honest bounds, and the real
// sizes checked against the reference drawing.

function segBounds(seg: Seg): Array<[number, number]> {
  if (seg.t === 'l') {
    const pts: Array<[number, number]> = []
    for (let i = 0; i < seg.p.length; i += 2) pts.push([seg.p[i], seg.p[i + 1]])
    return pts
  }
  // Arcs: the full circle is an outer bound; good enough for "inside the bbox".
  return [
    [seg.c[0] - seg.r, seg.c[1] - seg.r],
    [seg.c[0] + seg.r, seg.c[1] + seg.r],
  ]
}

describe('thư viện ký hiệu', () => {
  it('đủ 17 ký hiệu, id khớp khóa', () => {
    expect(SYMBOL_IDS).toHaveLength(17)
    for (const id of SYMBOL_IDS) expect(symbol(id).id).toBe(id)
  })

  it.each(SYMBOL_IDS)('%s: tọa độ hữu hạn, nét nằm trong bbox', (id) => {
    const sym = symbol(id)
    expect(sym.segs.length).toBeGreaterThan(0)
    const { x, y, w, h } = sym.bbox
    const tol = 0.02
    for (const seg of sym.segs) {
      if (seg.t === 'l') {
        expect(seg.p.length % 2).toBe(0)
        expect(seg.p.length).toBeGreaterThanOrEqual(4)
      } else {
        expect(seg.r).toBeGreaterThan(0)
      }
      if (seg.t === 'a') expect(seg.e).toBeGreaterThan(seg.s)
      for (const [px, py] of seg.t === 'a' ? [] : segBounds(seg)) {
        expect(Number.isFinite(px) && Number.isFinite(py)).toBe(true)
        expect(px).toBeGreaterThanOrEqual(x - tol)
        expect(px).toBeLessThanOrEqual(x + w + tol)
        expect(py).toBeGreaterThanOrEqual(y - tol)
        expect(py).toBeLessThanOrEqual(y + h + tol)
      }
    }
    for (const l of sym.stretch) {
      expect([1, -1]).toContain(l.dir)
      const [lo, size] = l.axis === 'x' ? [x, w] : [y, h]
      expect(l.at).toBeGreaterThan(lo)
      expect(l.at).toBeLessThan(lo + size)
    }
  })

  it('kích thước khớp bản vẽ mẫu', () => {
    const size = (id: Parameters<typeof symbol>[0]) => {
      const b = symbol(id).bbox
      return [Math.round(b.w), Math.round(b.h)]
    }
    expect(size('car-side')).toEqual([1186, 3932])
    expect(size('machine')).toEqual([662, 503])
    // Front door leaves: HH 2100.
    expect(size('door-front')[1]).toBe(2100)
  })

  it('ký hiệu đứng trên điểm chèn có đáy tại y = 0', () => {
    for (const id of [
      'car-side',
      'buffer-a',
      'buffer-b',
      'pit-ladder',
      'door-front',
      'jamb-wide-jd320',
      'jamb-narrow-35x50',
    ] as const) {
      const b = symbol(id).bbox
      expect(b.y + b.h, id).toBeCloseTo(0, 1)
    }
  })

  it('đặt cả thư viện lên trang không sinh số lỗi', () => {
    for (const id of SYMBOL_IDS) {
      const prims = placeSymbol(symbol(id), {
        at: { x: 210, y: 150 },
        scale: 1 / 25,
        stretch: { x: 100, y: 100 },
      })
      expect(prims.length).toBe(symbol(id).segs.length)
      expect(JSON.stringify(prims)).not.toMatch(/NaN|null|Infinity/)
    }
  })

  it.each(SYMBOL_IDS)('%s: cung quét < 360° (SVG bỏ cung đầu = cuối)', (id) => {
    for (const seg of symbol(id).segs) {
      if (seg.t === 'a') expect(seg.e - seg.s).toBeLessThan(360)
    }
  })

  it.each(SYMBOL_IDS)(
    '%s: cung nằm trong bbox (tính điểm cực trị thật)',
    (id) => {
      const { x, y, w, h } = symbol(id).bbox
      const tol = 0.05
      const rad = (d: number) => (d * Math.PI) / 180
      for (const seg of symbol(id).segs) {
        if (seg.t !== 'a') continue
        // Hai đầu cung + các góc 0/90/180/270 nằm trong khoảng quét.
        const angles = [seg.s, seg.e]
        for (let k = Math.ceil(seg.s / 90); k * 90 <= seg.e; k++)
          angles.push(k * 90)
        for (const a of angles) {
          const px = seg.c[0] + seg.r * Math.cos(rad(a))
          const py = seg.c[1] + seg.r * Math.sin(rad(a))
          expect(px).toBeGreaterThanOrEqual(x - tol)
          expect(px).toBeLessThanOrEqual(x + w + tol)
          expect(py).toBeGreaterThanOrEqual(y - tol)
          expect(py).toBeLessThanOrEqual(y + h + tol)
        }
      }
    },
  )

  it.each(SYMBOL_IDS)(
    '%s: đa tuyến sau khi lật/xoay/kéo giãn vẫn nằm trong placedBox',
    (id) => {
      const sym = symbol(id)
      for (const rotate of [0, 90, 180, 270] as const) {
        for (const mirrorX of [false, true]) {
          const o = {
            at: { x: 210, y: 150 },
            scale: 1 / 25,
            rotate,
            mirrorX,
            stretch: { x: 120, y: 80 },
          }
          const box = placedBox(sym, o)
          const tol = 1e-6
          for (const p of placeSymbol(sym, o)) {
            if (p.kind !== 'polyline') continue
            for (const q of p.pts) {
              expect(q.x).toBeGreaterThanOrEqual(box.x - tol)
              expect(q.x).toBeLessThanOrEqual(box.x + box.w + tol)
              expect(q.y).toBeGreaterThanOrEqual(box.y - tol)
              expect(q.y).toBeLessThanOrEqual(box.y + box.h + tol)
            }
          }
        }
      }
    },
  )
})

describe('cung khi kéo giãn', () => {
  it.each(SYMBOL_IDS)(
    '%s: không cung nào vắt qua đường kéo giãn; cung đã đặt nằm trong placedBox',
    (id) => {
      const sym = symbol(id)
      const rad = (d: number) => (d * Math.PI) / 180
      for (const l of sym.stretch) {
        for (const seg of sym.segs) {
          if (seg.t !== 'a') continue
          const k = l.axis === 'x' ? 0 : 1
          const sides = new Set(
            [seg.s, (seg.s + seg.e) / 2, seg.e]
              .map((a) =>
                k === 0
                  ? seg.c[0] + seg.r * Math.cos(rad(a))
                  : seg.c[1] + seg.r * Math.sin(rad(a)),
              )
              .map((v) => Math.sign(Math.round((v - l.at) * l.dir * 100))),
          )
          expect(sides.has(1) && sides.has(-1)).toBe(false)
        }
      }
      const o = {
        at: { x: 210, y: 150 },
        scale: 1 / 25,
        stretch: { x: 120, y: 300 },
      }
      const box = placedBox(sym, o)
      const tol = 0.01
      for (const p of placeSymbol(sym, o)) {
        if (p.kind !== 'arc') continue
        for (const a of [p.start, (p.start + p.end) / 2, p.end]) {
          const x = p.c.x + p.r * Math.cos(rad(a))
          const y = p.c.y + p.r * Math.sin(rad(a))
          expect(x).toBeGreaterThanOrEqual(box.x - tol)
          expect(x).toBeLessThanOrEqual(box.x + box.w + tol)
          expect(y).toBeGreaterThanOrEqual(box.y - tol)
          expect(y).toBeLessThanOrEqual(box.y + box.h + tol)
        }
      }
    },
  )
})
