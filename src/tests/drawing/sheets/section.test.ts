import { beforeEach, describe, expect, it, vi } from 'vitest'

import { derive } from '#/domain/derive'
import { presetParams } from '#/domain/presets'
import type { ElevatorParams } from '#/domain/schema'
import { SHEET_AREA } from '#/drawing/frame/layout'
import { primsBounds } from '#/drawing/sheets/figure'
import { SECTION } from '#/drawing/sheets/figure-layout'
import {
  THEO_THUC_TE,
  sectionLevels,
  sectionSheet,
} from '#/drawing/sheets/section'
import type * as Symbols from '#/drawing/symbols'
import type { PlaceOpts } from '#/drawing/symbols'
import type { Prim } from '#/drawing/types'
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
