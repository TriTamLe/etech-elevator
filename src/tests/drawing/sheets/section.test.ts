import { beforeEach, describe, expect, it, vi } from 'vitest'

import { derive } from '#/domain/derive'
import { presetParams } from '#/domain/presets'
import type { ElevatorParams } from '#/domain/schema'
import { SHEET_AREA } from '#/drawing/frame/layout'
import { primsBounds } from '#/drawing/sheets/figure'
import { SECTION } from '#/drawing/sheets/figure-layout'
import {
  THEO_THUC_TE,
  sectionEquipment,
  sectionLevels,
  sectionSheet,
} from '#/drawing/sheets/section'
import { symbol } from '#/drawing/symbols'
import type * as Symbols from '#/drawing/symbols'
import type { PlaceOpts } from '#/drawing/symbols'
import type { Prim, TextPrim } from '#/drawing/types'
import {
  EPS,
  expectInside,
  numbersOf,
  textSpan,
  texts,
} from '#/tests/drawing/helpers'

// Ghi lại các lần đặt ký hiệu (vẫn chạy hàm thật). `fitFigure` vẽ thử rồi vẽ thật nên mỗi
// ký hiệu được đặt nhiều lượt; so sánh theo tỷ lệ với bản gốc.
const spy = vi.hoisted(() => ({
  symbols: [] as Array<{ id: string; opts: PlaceOpts }>,
}))

vi.mock('#/drawing/symbols', async (orig) => {
  const m = await orig<typeof Symbols>()
  return {
    ...m,
    placeSymbol: (s: { id: string }, opts: PlaceOpts) => {
      spy.symbols.push({ id: s.id, opts })
      return m.placeSymbol(s as never, opts)
    },
  }
})

beforeEach(() => {
  spy.symbols.length = 0
})

type Id = 'house-5f' | 'hotel-9f'
const clone = (id: Id = 'house-5f') =>
  structuredClone<ElevatorParams>(presetParams(id))
const draw = (p: ElevatorParams) => sectionSheet(p, derive(p))
const frame = (p: ElevatorParams) => sectionLevels(p, derive(p))
const words = (out: Array<Prim>) => texts(out).map((t) => t.text)
const count = (out: Array<Prim>, w: string) =>
  words(out).filter((x) => x === w).length
const sideDoors = () =>
  spy.symbols.filter((s) => s.id === 'landing-door-side').length
const placed = (id: string) => spy.symbols.filter((s) => s.id === id)
const equipment = (p: ElevatorParams) => {
  const d = derive(p)
  return sectionEquipment(p, d, sectionLevels(p, d))
}

/** Bộ mẫu có đúng n tầng (tầng giữa lấy từ tầng 2). */
function withFloors(id: Id, n: number): ElevatorParams {
  const p = clone(id)
  const mid = p.floors[1]
  p.floors = Array.from({ length: n }, (_, i) => ({
    ...(i === 0 ? p.floors[0] : mid),
    name: `${i + 1}F`,
  }))
  return p
}

const finite = (out: Array<Prim>) => {
  for (const q of out)
    for (const n of numbersOf(q)) expect(Number.isFinite(n)).toBe(true)
}

/** Có nhóm gộp (nơi vẽ đường ngắt). */
const hasBreak = (p: ElevatorParams) => frame(p).levels.some((l) => l.collapsed)

describe('sectionLevels', () => {
  it('house-5f: 1F · 2F~3F · 4F · 5F(OH); cao độ 0/3400/6800/10200', () => {
    const f = frame(clone('house-5f'))
    expect(f.levels.map((l) => l.label)).toEqual([
      'TẦNG 1F',
      'TẦNG 2F~3F',
      'TẦNG 4F',
      'TẦNG 5F(OH)',
    ])
    expect(f.levels.map((l) => l.floor)).toEqual([0, 3400, 6800, 10200])
    expect(f.levels.map((l) => l.height)).toEqual([3400, 3400, 3400, 3600])
    expect(f.levels.map((l) => l.isTop)).toEqual([false, false, false, true])
    expect(f.levels.map((l) => l.collapsed)).toEqual([
      false,
      true,
      false,
      false,
    ])
    expect(f.machine).toBe(13800)
    expect(f.roof).toBe(15000)
    expect(f.roofTop).toBe(15000 + SECTION.roof.thick)
    expect(f.roofTop).toBe(15150)
  })

  it('hotel-9f: 1F · 2F~7F · 8F · 9F(OH)', () => {
    const p = clone('hotel-9f')
    const f = frame(p)
    expect(f.levels.map((l) => l.label)).toEqual([
      'TẦNG 1F',
      'TẦNG 2F~7F',
      'TẦNG 8F',
      'TẦNG 9F(OH)',
    ])
    expect(f.levels.map((l) => l.floor)).toEqual([0, 3400, 6800, 10200])
    expect(f.machine).toBe(10200 + p.tech.overhead)
    expect(f.roof).toBe(f.machine + p.tech.topRoomHeight)
  })

  it.each([2, 3, 4])('N = %i: không gộp, mỗi tầng một level', (n) => {
    const f = frame(withFloors('house-5f', n))
    expect(f.levels).toHaveLength(n)
    expect(f.levels.every((l) => !l.collapsed)).toBe(true)
    expect(f.levels.map((l) => l.label)).toEqual(
      Array.from({ length: n }, (_, i) =>
        i === n - 1 ? `TẦNG ${n}F(OH)` : `TẦNG ${i + 1}F`,
      ),
    )
    expect(f.levels.map((l) => l.floor)).toEqual(
      Array.from({ length: n }, (_, i) => i * 3400),
    )
    expect(f.levels.at(-1)!.isTop).toBe(true)
  })

  it.each([5, 9, 20])('N = %i: luôn 4 level, tầng giữa gộp', (n) => {
    const f = frame(withFloors('house-5f', n))
    expect(f.levels.map((l) => l.label)).toEqual([
      'TẦNG 1F',
      `TẦNG 2F~${n - 2}F`,
      `TẦNG ${n - 1}F`,
      `TẦNG ${n}F(OH)`,
    ])
    expect(f.levels.map((l) => l.collapsed)).toEqual([
      false,
      true,
      false,
      false,
    ])
    // Chiều cao hình không phụ thuộc N.
    expect(f.machine).toBe(13800)
    expect(f.roofTop).toBe(15150)
  })

  it('N = 5 cho nhóm giữa 2F~3F (2 tầng, đã gộp)', () => {
    const f = frame(withFloors('house-5f', 5))
    expect(f.levels[1].label).toBe('TẦNG 2F~3F')
    expect(f.levels[1].collapsed).toBe(true)
  })

  it('machine = đỉnh tầng trên cùng; roof, roofTop theo topRoomHeight và bản dày mái', () => {
    const p = clone('house-5f')
    p.tech.overhead = 4500
    p.tech.topRoomHeight = 2500
    const f = frame(p)
    expect(f.levels.at(-1)!.height).toBe(4500)
    expect(f.machine).toBe(10200 + 4500)
    expect(f.roof).toBe(f.machine + 2500)
    expect(f.roofTop).toBe(f.roof + SECTION.roof.thick)
  })

  describe('midBeams', () => {
    it('house-5f: tầng thường [1600]; tầng trên cùng [1500, 3000]', () => {
      const f = frame(clone('house-5f'))
      expect(f.levels[0].midBeams).toEqual([1600])
      expect(f.levels[1].midBeams).toEqual([1600])
      expect(f.levels[2].midBeams).toEqual([1600])
      expect(f.levels[3].midBeams).toEqual([1500, 3000])
    })

    it('đỉnh đà nằm dưới đáy dầm kiềng kế tiếp và đáy đà cao hơn sàn', () => {
      for (const id of ['house-5f', 'hotel-9f'] as const) {
        const p = clone(id)
        const f = frame(p)
        for (const l of f.levels)
          for (const t of l.midBeams) {
            expect(t).toBeLessThan(l.height - p.structure.ringBeamFloor.h)
            expect(t - p.structure.midBeam.h).toBeGreaterThan(0)
          }
      }
    })

    it('khoảng cách lớn hơn chiều cao: không có đà', () => {
      const p = clone('house-5f')
      p.structure.midBeam.spacing = 5000
      p.structure.midBeam.spacingTop = 9000
      const f = frame(p)
      for (const l of f.levels) expect(l.midBeams).toEqual([])
    })

    it('khoảng cách rất nhỏ: tối đa 20 đà mỗi level', () => {
      const p = clone('house-5f')
      p.structure.midBeam.spacing = 100
      p.structure.midBeam.spacingTop = 100
      const f = frame(p)
      for (const l of f.levels) {
        expect(l.midBeams.length).toBeLessThanOrEqual(20)
        expect(l.midBeams.length).toBeGreaterThan(0)
      }
    })

    it('đà quá sát sàn (đáy đà ≤ sàn) bị bỏ', () => {
      const p = clone('house-5f')
      p.structure.midBeam.h = 2000
      p.structure.midBeam.spacing = 1600
      const f = frame(p)
      expect(f.levels[0].midBeams).toEqual([])
    })
  })

  describe('door', () => {
    it('house-5f: 1F rộng, các level còn lại hẹp', () => {
      expect(frame(clone('house-5f')).levels.map((l) => l.door)).toEqual([
        'wide',
        'narrow',
        'narrow',
        'narrow',
      ])
    })

    it('nhóm có tầng đầu không cửa lấy bao che của tầng có cửa kế tiếp', () => {
      const p = clone('house-5f')
      p.floors[1].hasDoor = false // 2F không cửa, 3F hẹp có cửa
      p.floors[2].jamb = 'wide'
      const f = frame(p)
      expect(f.levels[1].label).toBe('TẦNG 2F~3F')
      expect(f.levels[1].door).toBe('wide')
    })

    it('cả nhóm không cửa → null; tầng khác không ảnh hưởng', () => {
      const p = clone('house-5f')
      p.floors[1].hasDoor = false
      p.floors[2].hasDoor = false
      const f = frame(p)
      expect(f.levels.map((l) => l.door)).toEqual([
        'wide',
        null,
        'narrow',
        'narrow',
      ])
    })

    it('mọi tầng không cửa → mọi level null', () => {
      const p = clone('house-5f')
      for (const fl of p.floors) fl.hasDoor = false
      expect(frame(p).levels.every((l) => l.door === null)).toBe(true)
    })
  })
})

describe.each(['house-5f', 'hotel-9f'] as const)('sectionSheet: %s', (id) => {
  const p = clone(id)
  const out = draw(p)
  const ws = words(out)

  it('mọi số hữu hạn; vẽ 2 lần giống hệt', () => {
    expect(out.length).toBeGreaterThan(200)
    finite(out)
    expect(draw(clone(id))).toEqual(out)
  })

  it('mọi điểm và hộp bao nằm trong SHEET_AREA', () => {
    expectInside(out, SHEET_AREA)
    const b = primsBounds(out)!
    expect(b.x).toBeGreaterThanOrEqual(SHEET_AREA.left - EPS)
    expect(b.x + b.w).toBeLessThanOrEqual(SHEET_AREA.right + EPS)
    expect(b.y).toBeGreaterThanOrEqual(SHEET_AREA.top - EPS)
    expect(b.y + b.h).toBeLessThanOrEqual(SHEET_AREA.bottom + EPS)
  })

  it('chữ không vượt khỏi vùng vẽ theo chiều ngang (đo bằng độ rộng thật)', () => {
    for (const t of texts(out)) {
      if (t.rotate) continue
      const [x0, x1] = textSpan(t)
      expect(x0, t.text).toBeGreaterThanOrEqual(SHEET_AREA.left - EPS)
      expect(x1, t.text).toBeLessThanOrEqual(SHEET_AREA.right + EPS)
    }
  })

  it('tên tầng, tên buồng trên cùng', () => {
    expect(ws).toContain('TẦNG 1F')
    expect(ws).toContain(id === 'house-5f' ? 'TẦNG 2F~3F' : 'TẦNG 2F~7F')
    expect(ws).toContain(p.topRoom.name)
  })

  it('PIT, OH và các số buồng trên', () => {
    expect(ws).toContain(`PIT = ${p.tech.pit}`)
    const oh = p.tech.overhead + p.tech.topRoomHeight
    expect(ws).toContain(`OH = ${oh}`)
    expect(ws).toContain(String(p.tech.overhead))
    expect(ws).toContain(String(p.tech.topRoomHeight))
    expect(ws).toContain(String(SECTION.roof.thick)) // 150
  })

  it('chiều cao lỗ chờ thô và cửa ở mỗi level có cửa', () => {
    const doors = frame(p).levels.filter((l) => l.door).length
    expect(count(out, String(p.structure.roughOpeningHeight))).toBe(doors)
    expect(count(out, String(p.tech.door.height))).toBe(doors)
  })

  it('"BH" và "AH" (nhãn chữ)', () => {
    expect(count(out, 'BH')).toBe(1)
    expect(count(out, 'AH')).toBe(1)
  })

  it('ký hiệu mặt cắt A, B, C mỗi chữ 2 lần (hai bên)', () => {
    for (const l of ['A', 'B', 'C']) expect(count(out, l), l).toBe(2)
  })

  it('"THEO THỰC TẾ": 3 ở hình hông (tầng thường) + 3 ở hình trước × số đà', () => {
    expect(THEO_THUC_TE).toBe('THEO THỰC TẾ')
    const f = frame(p)
    const side = f.levels.filter((l) => !l.isTop).length
    const front = f.levels
      .filter((l) => !l.isTop)
      .reduce((s, l) => s + l.midBeams.length + 1, 0)
    expect(count(out, THEO_THUC_TE)).toBe(side + front)
    if (id === 'house-5f') expect(count(out, THEO_THUC_TE)).toBe(3 + 6)
  })

  it('tầng trên cùng ở hình trước ghi số thật (đà 1500, 1500, 600)', () => {
    if (id !== 'house-5f') return
    // [1500, 3000, 3600] → 1500, 1500, 600
    expect(ws).toContain('600')
    expect(count(out, '1500')).toBeGreaterThanOrEqual(2)
  })
})

describe('sectionEquipment', () => {
  it.each(['house-5f', 'hotel-9f'] as const)(
    '%s: cụm cabin bám tường trước, cụm đối trọng bám tường sau',
    (id) => {
      const p = clone(id)
      const f = frame(p)
      const BH = p.tech.shaft.depth
      const pit = p.tech.pit
      const top = f.levels[f.levels.length - 1].floor
      const s = equipment(p).side
      expect(s.sheave).toEqual({ x: BH - 351, y: -(f.machine + 500) })
      expect(s.car).toEqual({ x: 682.1, y: -top + 607 })
      expect(s.pulley).toEqual({ x: 375.6, y: -top + 176.8 })
      expect(s.hitch).toEqual({ x: 369.5, y: -(f.machine + 553.5) })
      expect(s.bracket).toEqual({ x: 375.7, y: -(f.machine + 418.5) })
      expect(s.counterweight).toEqual({ x: BH - 191, y: pit - 448 })
      // F dưới cabin, U dưới đối trọng; cả hai đứng trên sàn pit.
      expect(s.buffers).toEqual([
        { x: 947.1, y: pit },
        { x: BH - 179.5, y: pit },
      ])
    },
  )

  it('móc theo form: hình hông dùng khoảng cách tới tường trước, hình trước tới vách trái', () => {
    const p = clone()
    const f = frame(p)
    // Để trống → tâm hố.
    p.topRoom.hook.x = null
    p.topRoom.hook.y = null
    let e = equipment(p)
    expect(e.side.hook).toEqual({ x: p.tech.shaft.depth / 2, y: -f.roof })
    expect(e.front.hook).toEqual({ x: p.tech.shaft.width / 2, y: -f.roof })
    p.topRoom.hook.x = 300
    p.topRoom.hook.y = 400
    e = equipment(p)
    expect(e.side.hook.x).toBe(400)
    expect(e.front.hook.x).toBe(300)
  })

  it('giảm chấn hình trước: F ở giữa hố, U cách vách phải 179,5', () => {
    const p = clone('hotel-9f')
    const AH = p.tech.shaft.width
    expect(equipment(p).front.buffers).toEqual([
      { x: AH / 2, y: p.tech.pit },
      { x: AH - 179.5, y: p.tech.pit },
    ])
  })

  describe('ô CPM hình trước', () => {
    it('đúng w × h từ form, từ sàn buồng trên, sát vách trái', () => {
      const p = clone('hotel-9f') // 800 × 1200, buồng trên 1500
      const f = frame(p)
      expect(equipment(p).front.cpm).toEqual({
        x: 0,
        y: -(f.machine + 1200),
        w: 800,
        h: 1200,
      })
    })

    it('bị chặn bởi chiều cao buồng trên và bề rộng hố', () => {
      const p = clone('house-5f')
      p.topRoom.cpm = { w: 5000, h: 9000 }
      const f = frame(p)
      expect(equipment(p).front.cpm).toEqual({
        x: 0,
        y: -f.roof,
        w: p.tech.shaft.width,
        h: p.tech.topRoomHeight,
      })
    })
  })

  describe('dây cáp', () => {
    it('đầu dây nằm ở tiếp tuyến puly máy (± bán kính 160)', () => {
      const p = clone()
      const s = equipment(p).side
      const [hitch, car, cw] = s.ropes
      expect(car[1]).toEqual({ x: s.sheave.x - 160, y: s.sheave.y })
      expect(cw[0]).toEqual({ x: s.sheave.x + 160, y: s.sheave.y })
      // Dây đối trọng đứng, đúng trục đối trọng, xuống tới đỉnh ký hiệu.
      expect(cw[1].x).toBe(s.counterweight.x)
      expect(cw[1].y).toBeCloseTo(
        s.counterweight.y + symbol('counterweight-side').bbox.y,
        6,
      )
      // Dây ty cáp đứng, theo trục trái của puly cabin.
      expect(hitch[0].x).toBe(s.pulley.x)
      expect(hitch[1].x).toBe(s.pulley.x)
    })

    it('BH = 1610 (như M7): dây puly cabin → máy đứng thẳng; BH khác thì xiên', () => {
      const p = clone()
      p.tech.shaft.depth = 1610
      let car = equipment(p).side.ropes[1]
      expect(car[0].x).toBeCloseTo(car[1].x, 6)
      p.tech.shaft.depth = 1900
      car = equipment(p).side.ropes[1]
      expect(car[1].x - car[0].x).toBeCloseTo(290, 6)
    })
  })
})

describe('sectionSheet: buồng trên và thiết bị', () => {
  it('đặt đủ ký hiệu: cabin, puly, giá ty cáp, ty cáp ½, máy lật, đối trọng, F/U và móc ở cả hai hình', () => {
    draw(clone())
    const n = placed('car-side').length
    expect(n).toBeGreaterThan(0)
    expect(placed('car-pulley-side')).toHaveLength(n)
    expect(placed('rope-hitch-bracket')).toHaveLength(n)
    expect(placed('counterweight-side')).toHaveLength(n)
    expect(placed('machine')).toHaveLength(n)
    expect(placed('buffer-a')).toHaveLength(2 * n)
    expect(placed('buffer-b')).toHaveLength(2 * n)
    expect(placed('hook-hang')).toHaveLength(2 * n)
    expect(placed('machine').every((s) => s.opts.mirrorX)).toBe(true)
    const car = placed('car-side')
    const hitch = placed('rope-hitch')
    expect(hitch).toHaveLength(n)
    hitch.forEach((h, i) =>
      expect(h.opts.scale / car[i].opts.scale).toBeCloseTo(0.5, 9),
    )
  })

  it('chữ "CPM w X h" ở hình hông, cỡ 75 so với kích thước 100', () => {
    const p = clone()
    const out = draw(p)
    const ts = texts(out)
    const cpm = ts.find((t) => t.text === 'CPM 800 X 1200') as TextPrim
    expect(cpm).toBeDefined()
    const dimText = ts.find((t) => t.text === '2300') as TextPrim
    expect(cpm.size / dimText.size).toBeCloseTo(75 / 100, 6)
  })

  it('chữ kích thước 100, tên tầng 150 (theo M7)', () => {
    const ts = texts(draw(clone()))
    const dimText = ts.find((t) => t.text === '2300')!
    const level = ts.find((t) => t.text === 'TẦNG 1F')!
    expect(dimText.size / level.size).toBeCloseTo(100 / 150, 6)
  })

  it('hai kiểu đỡ máy cho cùng một hình (chỉ ghi chú khác, ở P11c)', () => {
    const a = clone()
    const b = clone()
    a.topRoom.machineSupport = 'beams'
    b.topRoom.machineSupport = 'floor'
    expect(draw(a)).toEqual(draw(b))
  })

  it('có bệ máy cao 200 từ giữa tường trước tới tường sau', () => {
    const p = clone()
    const out = draw(p)
    const W = p.structure.wall
    const ratio = (p.tech.shaft.depth + W / 2) / SECTION.platform
    const found = out.some((q) => {
      if (q.kind !== 'polyline' || !q.closed || q.pts.length !== 4) return false
      const xs = q.pts.map((t) => t.x)
      const ys = q.pts.map((t) => t.y)
      const w = Math.max(...xs) - Math.min(...xs)
      const h = Math.max(...ys) - Math.min(...ys)
      return h > 0 && Math.abs(w / h - ratio) < 1e-6
    })
    expect(found).toBe(true)
  })
})

/** Đa giác kín 4 đỉnh, kèm hộp bao (tọa độ giấy). */
function quads(out: Array<Prim>) {
  return out
    .filter(
      (q): q is Extract<Prim, { kind: 'polyline' }> =>
        q.kind === 'polyline' && q.closed === true && q.pts.length === 4,
    )
    .map((q) => {
      const xs = q.pts.map((a) => a.x)
      const ys = q.pts.map((a) => a.y)
      return {
        q,
        x0: Math.min(...xs),
        x1: Math.max(...xs),
        y0: Math.min(...ys),
        y1: Math.max(...ys),
      }
    })
}

describe('sectionSheet: sàn sảnh, khung CPM, ô CPM hình trước', () => {
  it.each(['house-5f', 'hotel-9f'] as const)(
    '%s: sàn sảnh tầng mái vươn 955, vát 187; mỗi level còn lại vươn 754, vát 150 (dày 150)',
    (id) => {
      const p = clone(id)
      const out = draw(p)
      const n = frame(p).levels.length
      // Sàn sảnh: hình thang có cạnh trên (vươn) và cạnh dưới ngắn hơn đúng bằng độ vát.
      const slabs = quads(out).filter(({ q }) => {
        const [a, b, c, e] = q.pts
        return (
          Math.abs(a.y - b.y) < 1e-9 &&
          Math.abs(c.y - e.y) < 1e-9 &&
          Math.abs(a.x - e.x) < 1e-9 &&
          c.x < a.x &&
          c.y > a.y
        )
      })
      const shape = (r: number, bev: number) =>
        slabs.filter(({ q }) => {
          const [a, b, c, e] = q.pts
          const h = c.y - a.y
          return (
            Math.abs((a.x - b.x) / h - r / 150) < 1e-6 &&
            Math.abs((c.x - b.x) / h - bev / 150) < 1e-6 &&
            e.x === a.x
          )
        })
      expect(shape(955, 187)).toHaveLength(1)
      expect(shape(754, 150)).toHaveLength(n)
    },
  )

  it('khung CPM hình hông: rộng 50 nằm ở mặt ngoài tường trước (x = −W), cao từ mái xuống sàn buồng trên', () => {
    const p = clone()
    const f = frame(p)
    const out = draw(p)
    const frames = quads(out).filter(
      ({ q, x0, x1, y0, y1 }) =>
        q.weight === 'thin' &&
        Math.abs(
          (x1 - x0) / (y1 - y0) - SECTION.cpm.frame / (f.roof - f.machine),
        ) < 1e-6,
    )
    expect(frames).toHaveLength(1)
    const fr = frames[0]
    // Sàn sảnh bắt đầu đúng ở mặt ngoài tường trước (x = −W): mép trái khung trùng với nó.
    const k = (fr.x1 - fr.x0) / SECTION.cpm.frame
    const slab = quads(out).find(({ q }) => {
      const [a, b, c] = q.pts
      const h = c.y - a.y
      return (
        Math.abs(a.y - b.y) < 1e-9 &&
        h > 0 &&
        Math.abs((a.x - b.x) / h - 955 / 150) < 1e-6
      )
    })
    expect(slab).toBeDefined()
    expect(fr.x0).toBeCloseTo(slab!.q.pts[0].x, 6)
    // Các vạch trong cách mép trái 20, 25, 30.
    for (const dx of SECTION.cpm.lines) {
      const hit = out.some(
        (q) =>
          q.kind === 'line' &&
          Math.abs(q.a.x - q.b.x) < 1e-9 &&
          Math.abs(q.a.x - (fr.x0 + dx * k)) < 1e-6 &&
          Math.abs(Math.abs(q.a.y - q.b.y) / k - (f.roof - f.machine)) < 1e-6,
      )
      expect(hit).toBe(true)
    }
  })

  it('gạch chân chữ CPM chạy từ đầu chữ tới khung; chữ kết thúc cách khung 200', () => {
    const p = clone()
    const out = draw(p)
    const f = frame(p)
    const label = texts(out).find((t) => t.text === 'CPM 700 X 1200')
    const t = (label ??
      texts(out).find((x) => x.text.startsWith('CPM'))) as TextPrim
    expect(t).toBeDefined()
    const [x0, x1] = textSpan(t)
    const under = out.find(
      (q) =>
        q.kind === 'line' &&
        q.a.y === q.b.y &&
        q.a.y > t.y &&
        q.a.y - t.y < t.size &&
        Math.abs(q.a.x - x0) < 1e-6,
    ) as Extract<Prim, { kind: 'line' }>
    expect(under).toBeDefined()
    const fr = quads(out).find(
      ({ q, x0: a, x1: b, y0, y1 }) =>
        q.weight === 'thin' &&
        Math.abs(
          (b - a) / (y1 - y0) - SECTION.cpm.frame / (f.roof - f.machine),
        ) < 1e-6,
    )!
    // Đầu kia của gạch chân đúng mép trái khung, xa chữ đúng 200 (thật).
    expect(under.b.x).toBeCloseTo(fr.x0, 6)
    const k = (fr.x1 - fr.x0) / SECTION.cpm.frame
    expect(fr.x0 - x1).toBeCloseTo(SECTION.cpm.gap * k, 6)
  })

  it('chữ CPM theo form (không cố định 800 × 1200)', () => {
    const p = clone()
    p.topRoom.cpm = { w: 900, h: 1500 }
    expect(count(draw(p), 'CPM 900 X 1500')).toBe(1)
  })

  it.each(['house-5f', 'hotel-9f'] as const)(
    '%s: ô CPM hình trước có đúng 2 đường chéo nối các góc đối',
    (id) => {
      const p = clone(id)
      const { w, h } = p.topRoom.cpm
      const out = draw(p)
      const isDiag = (q: Prim, b: ReturnType<typeof quads>[number]) => {
        if (q.kind !== 'line') return false
        const xs = [q.a.x, q.b.x].sort((m, n) => m - n)
        const ys = [q.a.y, q.b.y].sort((m, n) => m - n)
        return (
          Math.abs(xs[0] - b.x0) < 1e-6 &&
          Math.abs(xs[1] - b.x1) < 1e-6 &&
          Math.abs(ys[0] - b.y0) < 1e-6 &&
          Math.abs(ys[1] - b.y1) < 1e-6
        )
      }
      const boxes = quads(out).filter(
        (b) =>
          b.q.weight === 'thin' &&
          Math.abs((b.x1 - b.x0) / (b.y1 - b.y0) - w / h) < 1e-6 &&
          out.some((q) => isDiag(q, b)),
      )
      expect(boxes).toHaveLength(1)
      const diag = out.filter((q) => isDiag(q, boxes[0])) as Array<
        Extract<Prim, { kind: 'line' }>
      >
      expect(diag).toHaveLength(2)
      // Hai chéo ngược hướng nhau (một lên, một xuống).
      const slope = diag.map((q) =>
        Math.sign((q.b.y - q.a.y) * (q.b.x - q.a.x)),
      )
      expect(slope.sort()).toEqual([-1, 1])
    },
  )
})

describe('sectionEquipment: không phụ thuộc số liệu preset ngoài SECTION', () => {
  it.each([2, 3, 5, 9, 20])(
    'N = %i: cụm cabin tính từ tầng trên cùng, cụm đối trọng từ sàn pit, đều hữu hạn',
    (n) => {
      const p = withFloors('house-5f', n)
      const f = frame(p)
      const top = f.levels[f.levels.length - 1].floor
      const s = equipment(p).side
      expect(s.car.y).toBeCloseTo(-top + SECTION.car.below, 9)
      expect(s.pulley.y).toBeCloseTo(-top + SECTION.pulley.below, 9)
      expect(s.hitch.y).toBeCloseTo(-(f.machine + SECTION.hitch.top), 9)
      expect(s.counterweight.y).toBe(p.tech.pit - SECTION.counterweight.up)
      expect(s.ropes).toHaveLength(3)
      for (const v of Object.values(equipment(p).front.cpm))
        expect(Number.isFinite(v)).toBe(true)
      for (const [a, b] of s.ropes)
        for (const v of [a.x, a.y, b.x, b.y])
          expect(Number.isFinite(v)).toBe(true)
    },
  )

  it.each([2, 20])('N = %i: bản vẽ đặt đủ ký hiệu thiết bị', (n) => {
    draw(withFloors('house-5f', n))
    for (const id of [
      'car-side',
      'car-pulley-side',
      'rope-hitch-bracket',
      'rope-hitch',
      'machine',
      'counterweight-side',
    ])
      expect(placed(id).length).toBeGreaterThan(0)
    expect(placed('buffer-a').length).toBeGreaterThan(0)
    expect(placed('buffer-b').length).toBeGreaterThan(0)
    expect(placed('hook-hang').length).toBeGreaterThan(0)
  })

  it('vị trí cabin, puly, giá, ty cáp, cửa đối trọng và giảm chấn chỉ do hằng số SECTION (hai preset cùng kích thước hố → cùng tọa độ)', () => {
    const a = clone('house-5f')
    const b = clone('hotel-9f')
    for (const p of [a, b]) {
      p.tech.shaft.depth = 1800
      p.tech.shaft.width = 2000
      p.tech.pit = 1400
      p.tech.topRoomHeight = 1500
      p.tech.overhead = 3600
    }
    const sa = equipment(a).side
    const sb = equipment(b).side
    const rel = (p: ElevatorParams, y: number) =>
      y + frame(p).levels[frame(p).levels.length - 1].floor
    expect(sa.car.x).toBe(sb.car.x)
    expect(sa.pulley.x).toBe(sb.pulley.x)
    expect(sa.bracket.x).toBe(sb.bracket.x)
    expect(sa.hitch.x).toBe(sb.hitch.x)
    expect(sa.buffers).toEqual(sb.buffers)
    expect(sa.counterweight).toEqual(sb.counterweight)
    expect(rel(a, sa.car.y)).toBeCloseTo(rel(b, sb.car.y), 9)
    expect(rel(a, sa.pulley.y)).toBeCloseTo(rel(b, sb.pulley.y), 9)
    expect(sa.sheave.x).toBe(sb.sheave.x)
  })
})

describe('sectionSheet: số "THEO THỰC TẾ" theo số tầng', () => {
  it('đúng theo số level thường và số đà, với N = 2…20', () => {
    const per = (n: number) => {
      const p = withFloors('house-5f', n)
      return {
        got: count(draw(p), THEO_THUC_TE),
        want: frame(p)
          .levels.filter((l) => !l.isTop)
          .reduce((s, l) => s + 1 + l.midBeams.length + 1, 0),
      }
    }
    for (const n of [2, 3, 4, 5, 9, 20]) {
      const r = per(n)
      expect(r.got, `N=${n}`).toBe(r.want)
    }
  })
})

describe('sectionSheet: cửa nhìn hông', () => {
  it('mỗi level có cửa đặt đúng một cửa hông; level không cửa thì không', () => {
    draw(clone('house-5f'))
    const all = sideDoors()
    expect(all).toBeGreaterThan(0)
    const passes = all / 4 // 4 level đều có cửa
    expect(Number.isInteger(passes)).toBe(true)

    const place = (mut: (p: ElevatorParams) => void) => {
      spy.symbols.length = 0
      const p = clone('house-5f')
      mut(p)
      draw(p)
      return sideDoors() / passes
    }
    // Nhóm 2F~3F: một tầng không cửa vẫn còn cửa ở tầng kia.
    expect(
      place((p) => {
        p.floors[1].hasDoor = false
      }),
    ).toBe(4)
    // Cả nhóm 2F~3F không cửa → 3 level.
    expect(
      place((p) => {
        p.floors[1].hasDoor = false
        p.floors[2].hasDoor = false
      }),
    ).toBe(3)
    // Không tầng nào có cửa.
    expect(
      place((p) => {
        for (const f of p.floors) f.hasDoor = false
      }),
    ).toBe(0)
  })

  it('số chữ "2300" (lỗ chờ thô) = số level có cửa', () => {
    const p = clone('house-5f')
    expect(count(draw(p), '2300')).toBe(4)
    p.floors[1].hasDoor = false
    p.floors[2].hasDoor = false
    expect(count(draw(p), '2300')).toBe(3)
    p.floors[0].hasDoor = false
    expect(count(draw(p), '2300')).toBe(2)
    for (const f of p.floors) f.hasDoor = false
    expect(count(draw(p), '2300')).toBe(0)
    expect(count(draw(p), '2100')).toBe(0)
  })

  it('cửa nhìn trước cũng chỉ ở level có cửa (door-front)', () => {
    const run = (mut: (p: ElevatorParams) => void) => {
      spy.symbols.length = 0
      const p = clone('house-5f')
      mut(p)
      draw(p)
      return spy.symbols.filter((s) => s.id === 'door-front').length
    }
    const all = run(() => {})
    const none = run((p) => {
      for (const f of p.floors) f.hasDoor = false
    })
    expect(all).toBeGreaterThan(0)
    expect(none).toBe(0)
    const three = run((p) => {
      p.floors[1].hasDoor = false
      p.floors[2].hasDoor = false
    })
    expect(three * 4).toBe(all * 3)
  })
})

describe('sectionSheet: đường ngắt chỉ ở nhóm gộp', () => {
  /** Nét medium dài hơn bề rộng hình, đi thành cặp song song cách 0.8 mm. */
  const breaks = (out: Array<Prim>) => {
    const lines = out.filter(
      (q): q is Extract<Prim, { kind: 'line' }> =>
        q.kind === 'line' && q.weight === 'medium' && q.a.y === q.b.y,
    )
    const pairs: Array<number> = []
    for (const a of lines)
      for (const b of lines)
        if (
          a !== b &&
          a.a.x === b.a.x &&
          a.b.x === b.b.x &&
          Math.abs(Math.abs(a.a.y - b.a.y) - 0.8) < 1e-6 &&
          a.a.y < b.a.y
        )
          pairs.push(a.a.y)
    return pairs
  }

  it.each([2, 3, 4])('N = %i: không có đường ngắt', (n) => {
    const p = withFloors('house-5f', n)
    expect(hasBreak(p)).toBe(false)
    expect(breaks(draw(p))).toHaveLength(0)
  })

  it.each([5, 9, 20])(
    'N = %i: 2 cặp đường ngắt (hình hông và hình trước)',
    (n) => {
      const p = withFloors('house-5f', n)
      expect(hasBreak(p)).toBe(true)
      expect(breaks(draw(p))).toHaveLength(2)
    },
  )
})

describe('sectionSheet: chiều cao hình không đổi theo N', () => {
  // Only the height: a longer group name ("TẦNG 2F~18F") may widen the figure.
  it('chiều cao hình giống nhau giữa N = 5, 9, 20', () => {
    const bs = [5, 9, 20].map((n) =>
      primsBounds(draw(withFloors('house-5f', n)))!,
    )
    for (const b of bs.slice(1)) {
      expect(b.y).toBeCloseTo(bs[0].y, 6)
      expect(b.h).toBeCloseTo(bs[0].h, 6)
    }
  })
})

describe('sectionSheet: thông số lạ không ném lỗi, nằm trong SHEET_AREA', () => {
  const cases: Array<[string, (p: ElevatorParams) => void]> = [
    ['N = 2', (p) => void (p.floors = p.floors.slice(0, 2))],
    [
      'N = 20',
      (p) => {
        p.floors = Array.from({ length: 20 }, (_, i) => ({
          ...p.floors[1],
          name: `${i + 1}F`,
        }))
      },
    ],
    ['OH 4500', (p) => void (p.tech.overhead = 4500)],
    ['buồng trên 2500', (p) => void (p.tech.topRoomHeight = 2500)],
    ['PIT 2000', (p) => void (p.tech.pit = 2000)],
    [
      'AH 2200, BH 2500',
      (p) => {
        p.tech.shaft.width = 2200
        p.tech.shaft.depth = 2500
      },
    ],
    [
      'tên buồng trên dài',
      (p) => void (p.topRoom.name = 'TẦNG MÁI KỸ THUẬT '.repeat(12).trim()),
    ],
    [
      'tên tầng dài',
      (p) => void (p.floors[1].name = 'TẦNG-RẤT-DÀI-'.repeat(8)),
    ],
    ['midBeam.spacing = 100', (p) => void (p.structure.midBeam.spacing = 100)],
    [
      'midBeam.spacingTop = 100',
      (p) => void (p.structure.midBeam.spacingTop = 100),
    ],
    ['BH 1300', (p) => void (p.tech.shaft.depth = 1300)],
    ['buồng trên 900', (p) => void (p.tech.topRoomHeight = 900)],
    ['PIT 1100', (p) => void (p.tech.pit = 1100)],
    ['CPM 1500 × 1800', (p) => void (p.topRoom.cpm = { w: 1500, h: 1800 })],
    [
      'móc sát tường',
      (p) => {
        p.topRoom.hook.x = 50
        p.topRoom.hook.y = 50
      },
    ],
    [
      'không tầng nào có cửa',
      (p) => {
        for (const f of p.floors) f.hasDoor = false
      },
    ],
  ]
  it.each(cases)('%s', (_name, mut) => {
    for (const id of ['house-5f', 'hotel-9f'] as const) {
      const p = clone(id)
      mut(p)
      const out = draw(p)
      expect(out.length).toBeGreaterThan(50)
      finite(out)
      expectInside(out, SHEET_AREA)
      const b = primsBounds(out)!
      expect(b.x).toBeGreaterThanOrEqual(SHEET_AREA.left - EPS)
      expect(b.x + b.w).toBeLessThanOrEqual(SHEET_AREA.right + EPS)
      expect(b.y).toBeGreaterThanOrEqual(SHEET_AREA.top - EPS)
      expect(b.y + b.h).toBeLessThanOrEqual(SHEET_AREA.bottom + EPS)
    }
  })
})
