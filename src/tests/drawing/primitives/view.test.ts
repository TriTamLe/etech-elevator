import { describe, expect, it } from 'vitest'

import { len, toSheet, view } from '#/drawing/primitives/view'

describe('view', () => {
  it('scale = 1/n, giữ nguyên n và gốc', () => {
    const origin = { x: 12, y: 34 }
    expect(view(50, origin)).toEqual({ n: 50, scale: 0.02, origin })
  })

  it('là dữ liệu thuần: hai lần gọi cho kết quả giống hệt', () => {
    expect(view(25, { x: 1, y: 2 })).toEqual(view(25, { x: 1, y: 2 }))
  })
})

describe('toSheet', () => {
  it('gốc thật (0, 0) rơi đúng vào origin của trang', () => {
    expect(toSheet(view(50, { x: 100, y: 200 }), { x: 0, y: 0 })).toEqual({
      x: 100,
      y: 200,
    })
  })

  it('1:50: (1000, 500) mm thật → origin + (20, 10) mm giấy', () => {
    expect(toSheet(view(50, { x: 100, y: 200 }), { x: 1000, y: 500 })).toEqual({
      x: 120,
      y: 210,
    })
  })

  it('y âm (mặt cắt đứng: y = −cao độ) đi lên trên trang', () => {
    const p = toSheet(view(50, { x: 100, y: 200 }), { x: 0, y: -2500 })
    expect(p.y).toBeCloseTo(150, 9)
    expect(p.y).toBeLessThan(200)
  })

  it('1:1 là phép đồng nhất cộng origin', () => {
    expect(toSheet(view(1, { x: 0, y: 0 }), { x: 7.5, y: -3 })).toEqual({
      x: 7.5,
      y: -3,
    })
  })

  it('tuyến tính: hiệu hai điểm trên giấy = len(hiệu thật)', () => {
    const v = view(33, { x: 10, y: 20 })
    const a = toSheet(v, { x: 5000, y: 1200 })
    const b = toSheet(v, { x: 800, y: 4100 })
    expect(a.x - b.x).toBeCloseTo(len(v, 4200), 9)
    expect(a.y - b.y).toBeCloseTo(len(v, -2900), 9)
  })
})

describe('len', () => {
  it.each([
    [10, 1500, 150],
    [20, 1500, 75],
    [75, 1500, 20],
    [100, 0, 0],
  ])('1:%s: %s mm thật → %s mm giấy', (n, mm, expected) => {
    expect(len(view(n, { x: 0, y: 0 }), mm)).toBeCloseTo(expected, 9)
  })

  it('không phụ thuộc origin', () => {
    expect(len(view(40, { x: 99, y: -7 }), 2000)).toBe(
      len(view(40, { x: 0, y: 0 }), 2000),
    )
  })
})
