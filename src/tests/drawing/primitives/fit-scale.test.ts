import { describe, expect, it } from 'vitest'

import { SHEET_AREA } from '#/drawing/frame/layout'
import { FIT_SCALES, fitScale } from '#/drawing/primitives/fit-scale'
import { toSheet } from '#/drawing/primitives/view'

// Vùng thử 100 × 50 mm giấy: dễ nhẩm "vừa ở 1:n khi w/n ≤ 100 và h/n ≤ 50".
const AREA = { left: 0, top: 0, right: 100, bottom: 50 }

/** PRNG có hạt giống (mulberry32): test ngẫu nhiên nhưng lặp lại được. */
function rng(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('FIT_SCALES', () => {
  it('đúng danh sách tỷ lệ tròn đã chốt, tăng dần (bản vẽ to nhất trước)', () => {
    expect(FIT_SCALES).toEqual([
      10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 200,
    ])
    expect([...FIT_SCALES].sort((a, b) => a - b)).toEqual([...FIT_SCALES])
  })
})

describe('fitScale: chọn tỷ lệ', () => {
  it('hộp nhỏ → 1:10 (to nhất), fits', () => {
    const v = fitScale({ x: 0, y: 0, w: 300, h: 200 }, { area: AREA })
    expect(v.n).toBe(10)
    expect(v.scale).toBeCloseTo(0.1, 12)
    expect(v.fits).toBe(true)
  })

  it.each([
    // [w, h, n mong đợi]
    [1000, 400, 10], // đúng 100 × 40 ở 1:10
    [1001, 400, 15],
    [1500, 400, 15], // đúng 100 ở 1:15
    [1600, 400, 20],
    [2000, 100, 20],
    [1000, 500, 10], // h/10 = 50 = đúng cạnh vùng
    [1000, 501, 15],
    [1000, 1200, 25], // chiều cao quyết định: 1200/25 = 48
    [20000, 100, 200], // đúng 100 ở 1:200
  ])('hộp %s × %s mm → 1:%s', (w, h, n) => {
    const v = fitScale({ x: 0, y: 0, w, h }, { area: AREA })
    expect(v.n).toBe(n)
    expect(v.fits).toBe(true)
  })

  it('chọn n nhỏ nhất vừa: n liền trước trong danh sách thì không vừa', () => {
    const rand = rng(7)
    for (let i = 0; i < 300; i++) {
      const w = rand() * 18000
      const h = rand() * 9000
      const v = fitScale({ x: 0, y: 0, w, h }, { area: AREA })
      if (!v.fits) continue
      const idx = FIT_SCALES.indexOf(v.n)
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(w / v.n).toBeLessThanOrEqual(100 + 1e-9)
      expect(h / v.n).toBeLessThanOrEqual(50 + 1e-9)
      if (idx > 0) {
        const prev = FIT_SCALES[idx - 1]
        expect(w / prev > 100 || h / prev > 50).toBe(true)
      }
    }
  })

  it('w, h âm (hộp dựng ngược) được tính theo trị tuyệt đối', () => {
    const a = fitScale({ x: 0, y: 0, w: 1600, h: 400 }, { area: AREA })
    const b = fitScale({ x: 1600, y: 400, w: -1600, h: -400 }, { area: AREA })
    expect(b.n).toBe(a.n)
    expect(b.fits).toBe(true)
  })

  it('hộp rỗng (w = h = 0) vẫn ra 1:10, không ném lỗi', () => {
    const v = fitScale({ x: 5, y: 5, w: 0, h: 0 }, { area: AREA })
    expect(v.n).toBe(10)
    expect(v.fits).toBe(true)
  })
})

describe('fitScale: canh giữa', () => {
  it('tâm hộp rơi đúng tâm vùng (vùng không phải gốc 0)', () => {
    const area = { left: 20, top: 30, right: 120, bottom: 80 }
    const box = { x: 700, y: -1200, w: 1500, h: 400 }
    const v = fitScale(box, { area })
    const c = toSheet(v, { x: box.x + box.w / 2, y: box.y + box.h / 2 })
    expect(c.x).toBeCloseTo(70, 9)
    expect(c.y).toBeCloseTo(55, 9)
  })

  it('hộp vừa nằm trọn trong vùng', () => {
    const box = { x: 0, y: 0, w: 1234, h: 321 }
    const v = fitScale(box, { area: AREA })
    const p0 = toSheet(v, { x: box.x, y: box.y })
    const p1 = toSheet(v, { x: box.x + box.w, y: box.y + box.h })
    expect(p0.x).toBeGreaterThanOrEqual(AREA.left - 1e-9)
    expect(p0.y).toBeGreaterThanOrEqual(AREA.top - 1e-9)
    expect(p1.x).toBeLessThanOrEqual(AREA.right + 1e-9)
    expect(p1.y).toBeLessThanOrEqual(AREA.bottom + 1e-9)
  })

  it('hộp y âm (mặt cắt đứng: y = −cao độ) cũng canh giữa', () => {
    const box = { x: 0, y: -20000, w: 2000, h: 20000 }
    const area = { left: 0, top: 0, right: 200, bottom: 100 }
    const v = fitScale(box, { area })
    const c = toSheet(v, { x: 1000, y: -10000 })
    expect(c.x).toBeCloseTo(100, 9)
    expect(c.y).toBeCloseTo(50, 9)
  })

  it('hộp có w, h âm: tâm vẫn đúng (lấy góc nhỏ hơn làm gốc)', () => {
    const v = fitScale({ x: 1000, y: 400, w: -1000, h: -400 }, { area: AREA })
    const c = toSheet(v, { x: 500, y: 200 })
    expect(c.x).toBeCloseTo(50, 9)
    expect(c.y).toBeCloseTo(25, 9)
  })
})

describe('fitScale: pad', () => {
  it('pad số trừ đều 4 cạnh: vùng còn 80 × 30', () => {
    // 800 × 300 ở 1:10 = 80 × 30 vừa khít vùng đã trừ pad 10.
    const v = fitScale({ x: 0, y: 0, w: 800, h: 300 }, { area: AREA, pad: 10 })
    expect(v.n).toBe(10)
    expect(v.fits).toBe(true)
    const w = fitScale({ x: 0, y: 0, w: 801, h: 300 }, { area: AREA, pad: 10 })
    expect(w.n).toBe(15)
  })

  it('pad từng cạnh: tâm dời theo phần pad không đối xứng', () => {
    const pad = { left: 30, right: 10 } // vùng thật x ∈ [30, 90], y ∈ [0, 50]
    const box = { x: 0, y: 0, w: 600, h: 100 }
    const v = fitScale(box, { area: AREA, pad })
    expect(v.n).toBe(10)
    const c = toSheet(v, { x: 300, y: 50 })
    expect(c.x).toBeCloseTo(60, 9)
    expect(c.y).toBeCloseTo(25, 9)
  })

  it('pad làm đổi tỷ lệ: không pad vừa 1:10, có pad lớn phải 1:15', () => {
    const box = { x: 0, y: 0, w: 1000, h: 500 }
    expect(fitScale(box, { area: AREA }).n).toBe(10)
    expect(fitScale(box, { area: AREA, pad: { bottom: 5 } }).n).toBe(15)
  })
})

describe('fitScale: pad thiếu hoặc không hợp lệ coi là 0', () => {
  const box = { x: 0, y: 0, w: 1300, h: 400 }
  const base = fitScale(box, { area: AREA })

  it.each([
    ['pad = {} (thiếu cả 4 cạnh)', {}],
    ['cạnh undefined', { top: undefined, left: undefined }],
    ['cạnh NaN', { top: NaN, right: NaN, bottom: NaN, left: NaN }],
    ['cạnh Infinity', { top: Infinity, left: -Infinity }],
  ])('%s → như pad 0', (_t, pad) => {
    const v = fitScale(box, { area: AREA, pad })
    expect(v).toEqual(base)
    for (const n of [v.n, v.scale, v.origin.x, v.origin.y])
      expect(Number.isFinite(n)).toBe(true)
  })

  it('pad số NaN / Infinity / undefined → như pad 0', () => {
    for (const pad of [NaN, Infinity, undefined])
      expect(fitScale(box, { area: AREA, pad })).toEqual(base)
  })

  it('cạnh hợp lệ vẫn được tính khi cạnh khác hỏng', () => {
    const a = fitScale(box, { area: AREA, pad: { left: 20, right: NaN } })
    const b = fitScale(box, { area: AREA, pad: { left: 20 } })
    expect(a).toEqual(b)
    expect(a.n).toBeGreaterThanOrEqual(base.n)
  })

  it('hộp có NaN cùng pad hỏng: origin ở tâm vùng, không NaN', () => {
    const v = fitScale({ ...box, w: NaN }, { area: AREA, pad: { top: NaN } })
    expect(v.origin).toEqual({ x: 50, y: 25 })
  })
})

describe('fitScale: không vừa', () => {
  it('lấy n lớn nhất (1:200) và fits = false', () => {
    const v = fitScale({ x: 0, y: 0, w: 30000, h: 100 }, { area: AREA })
    expect(v.n).toBe(200)
    expect(v.fits).toBe(false)
  })

  it('vẫn canh giữa dù tràn', () => {
    const box = { x: 0, y: 0, w: 40000, h: 100 }
    const v = fitScale(box, { area: AREA })
    const c = toSheet(v, { x: 20000, y: 50 })
    expect(c.x).toBeCloseTo(50, 9)
    expect(c.y).toBeCloseTo(25, 9)
  })

  it('đúng 1:200 vừa khít thì fits, hơn một chút thì không', () => {
    expect(fitScale({ x: 0, y: 0, w: 20000, h: 10 }, { area: AREA }).fits).toBe(
      true,
    )
    expect(fitScale({ x: 0, y: 0, w: 20001, h: 10 }, { area: AREA }).fits).toBe(
      false,
    )
  })
})

describe('fitScale: hộp có số không hợp lệ (ô form bỏ trống)', () => {
  it.each([
    ['x', { x: NaN, y: 0, w: 100, h: 100 }],
    ['y', { x: 0, y: NaN, w: 100, h: 100 }],
    ['w', { x: 0, y: 0, w: NaN, h: 100 }],
    ['h', { x: 0, y: 0, w: 100, h: NaN }],
    ['w = Infinity', { x: 0, y: 0, w: Infinity, h: 100 }],
  ])('NaN ở %s → n lớn nhất, fits = false, origin ở tâm vùng', (_t, box) => {
    const area = { left: 10, top: 20, right: 110, bottom: 70 }
    const v = fitScale(box, { area })
    expect(v.n).toBe(200)
    expect(v.fits).toBe(false)
    expect(v.origin).toEqual({ x: 60, y: 45 })
    expect(Number.isFinite(v.scale)).toBe(true)
  })

  it('NaN: tâm vùng đã trừ pad', () => {
    const v = fitScale(
      { x: NaN, y: 0, w: 1, h: 1 },
      { area: AREA, pad: { left: 20, top: 10 } },
    )
    expect(v.origin).toEqual({ x: 60, y: 30 })
  })

  it('NaN không ném lỗi', () => {
    expect(() =>
      fitScale({ x: NaN, y: NaN, w: NaN, h: NaN }, { area: AREA }),
    ).not.toThrow()
  })
})

describe('fitScale: mặc định và tùy chọn', () => {
  it('area mặc định là SHEET_AREA', () => {
    const box = { x: 0, y: 0, w: 3000, h: 2000 }
    expect(fitScale(box)).toEqual(fitScale(box, { area: SHEET_AREA }))
  })

  it('hộp nhỏ ở vùng mặc định: tâm hộp trùng tâm SHEET_AREA', () => {
    const v = fitScale({ x: 0, y: 0, w: 1000, h: 1000 })
    const c = toSheet(v, { x: 500, y: 500 })
    expect(c.x).toBeCloseTo((SHEET_AREA.left + SHEET_AREA.right) / 2, 9)
    expect(c.y).toBeCloseTo((SHEET_AREA.top + SHEET_AREA.bottom) / 2, 9)
  })

  it('scales tùy chỉnh thay danh sách mặc định', () => {
    const v = fitScale(
      { x: 0, y: 0, w: 1000, h: 100 },
      { area: AREA, scales: [5, 12, 50] },
    )
    expect(v.n).toBe(12) // 1000/5 = 200 > 100; 1000/12 ≈ 83
    expect(v.fits).toBe(true)
    const none = fitScale(
      { x: 0, y: 0, w: 100000, h: 100 },
      { area: AREA, scales: [5, 12, 50] },
    )
    expect(none.n).toBe(50)
    expect(none.fits).toBe(false)
  })

  it('scales rỗng → quay về FIT_SCALES', () => {
    const box = { x: 0, y: 0, w: 1500, h: 400 }
    expect(fitScale(box, { area: AREA, scales: [] }).n).toBe(
      fitScale(box, { area: AREA }).n,
    )
  })

  it('gọi 2 lần ra kết quả giống hệt, mọi số hữu hạn', () => {
    const box = { x: 123, y: -456, w: 7890, h: 1234 }
    const a = fitScale(box)
    expect(fitScale(box)).toEqual(a)
    for (const n of [a.n, a.scale, a.origin.x, a.origin.y])
      expect(Number.isFinite(n)).toBe(true)
  })
})
