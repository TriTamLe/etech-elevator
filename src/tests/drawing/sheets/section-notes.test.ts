import { describe, expect, it } from 'vitest'

import { derive } from '#/domain/derive'
import { presetParams } from '#/domain/presets'
import type { ElevatorParams } from '#/domain/schema'
import { UNDERLINE_DROP } from '#/drawing/prims'
import { dimStyle } from '#/drawing/primitives'
import type { View } from '#/drawing/primitives'
import { cadSize } from '#/drawing/sheets/figure'
import { SECTION } from '#/drawing/sheets/figure-layout'
import {
  sectionEquipment,
  sectionLevels,
  sectionSheet,
} from '#/drawing/sheets/section'
import {
  HEIGHT_TABLE_HEADER,
  NO_HEIGHT,
  frontNotes,
  heightTable,
  hookDetail,
  sideColumnNotes,
  sideNotes,
} from '#/drawing/sheets/section-notes'
import { ascent, descent, measure } from '#/drawing/text-metrics'
import type { Prim, TextPrim } from '#/drawing/types'
import { textSpan, texts } from '#/tests/drawing/helpers'

type Id = 'house-5f' | 'hotel-9f'
const clone = (id: Id = 'house-5f') =>
  structuredClone<ElevatorParams>(presetParams(id))
const draw = (p: ElevatorParams) => sectionSheet(p, derive(p))
const frame = (p: ElevatorParams) => sectionLevels(p, derive(p))
const words = (out: Array<Prim>) => texts(out).map((t) => t.text)
const count = (out: Array<Prim>, w: string) =>
  words(out).filter((x) => x === w).length

function withFloors(id: Id, n: number): ElevatorParams {
  const p = clone(id)
  const mid = p.floors[1]
  p.floors = Array.from({ length: n }, (_, i) => ({
    ...(i === 0 ? p.floors[0] : mid),
    name: `${i + 1}F`,
  }))
  return p
}

/** Ink box of an unrotated text (sheet mm). */
function box(t: TextPrim) {
  const [x0, x1] = textSpan(t)
  return { x0, x1, y0: t.y - ascent(t.size), y1: t.y + descent(t.size) }
}

/** Pairs of unrotated texts whose boxes overlap (beyond a hair). */
function overlaps(out: Array<Prim>): Array<[string, string]> {
  const ts = texts(out).filter((t) => !t.rotate)
  const bs = ts.map(box)
  const hits: Array<[string, string]> = []
  const e = 0.05
  for (let i = 0; i < ts.length; i++)
    for (let j = i + 1; j < ts.length; j++) {
      const a = bs[i]
      const b = bs[j]
      if (
        a.x0 < b.x1 - e &&
        b.x0 < a.x1 - e &&
        a.y0 < b.y1 - e &&
        b.y0 < a.y1 - e
      )
        hits.push([ts[i].text, ts[j].text])
    }
  return hits
}

describe('ghi chú dẫn: chữ lấy từ form', () => {
  it('house-5f: dầm kiềng mái, sàn, dầm đầu cửa, đà và móc', () => {
    const p = clone()
    const out = draw(p)
    const ws = words(out)
    expect(ws).toContain('200x300') // dầm kiềng mái
    expect(ws).toContain('200 x 400') // dầm kiềng sàn
    expect(ws).toContain('*Dầm bê tông 200 x 400') // sàn buồng trên
    expect(ws).toContain('200x200') // dầm đầu cửa
    expect(ws).toContain('*Đà bê tông giữa tầng 200x200')
    expect(count(out, '*Móc treo tải 2 tấn')).toBe(2)
  })

  it('cỡ dầm và đà lạ in đúng theo form', () => {
    const p = clone()
    p.structure.ringBeamTop = { w: 250, h: 350 }
    p.structure.ringBeamFloor = { w: 250, h: 450 }
    p.structure.doorHeadBeam = { w: 300, h: 250 }
    p.structure.midBeam = { ...p.structure.midBeam, w: 220, h: 180 }
    const ws = words(draw(p))
    expect(ws).toContain('250x350')
    expect(ws).toContain('250 x 450')
    expect(ws).toContain('*Dầm bê tông 250 x 450')
    expect(ws).toContain('300x250')
    expect(ws).toContain('*Đà bê tông giữa tầng 220x180')
  })

  it('khoảng cách đà: spacing ở level thường, spacingTop ở tầng trên cùng', () => {
    const p = clone()
    const f = frame(p)
    const out = draw(p)
    const normal = f.levels.filter((l) => !l.isTop && l.midBeams.length).length
    const { spacing, spacingTop } = p.structure.midBeam
    expect(count(out, `khoảng cách giữa 2 đà = ${spacing}`)).toBe(normal)
    expect(count(out, `khoảng cách giữa 2 đà = ${spacingTop}`)).toBe(1)
  })

  it('tải móc lẻ in dấu phẩy thập phân', () => {
    const p = clone()
    p.topRoom.hook.loadTon = 1.5
    expect(count(draw(p), '*Móc treo tải 1,5 tấn')).toBe(2)
  })

  it('kiểu đỡ máy: dầm → "Vị trí đặt máy", sàn → "Sàn đặt máy 200x200"', () => {
    const p = clone()
    p.topRoom.machineSupport = 'beams'
    expect(words(draw(p))).toContain('*Vị trí đặt máy')
    p.topRoom.machineSupport = 'floor'
    const ws = words(draw(p))
    expect(ws).toContain(`*Sàn đặt máy ${SECTION.platform}x${SECTION.platform}`)
    expect(ws).not.toContain('*Vị trí đặt máy')
  })
})

describe('ghi chú dẫn: số lượng', () => {
  it.each([2, 3, 4, 5, 9, 20])('N = %i', (n) => {
    const p = withFloors('house-5f', n)
    const f = frame(p)
    const out = draw(p)
    const mids = f.levels.filter((l) => l.midBeams.length).length
    expect(count(out, `*Đà bê tông giữa tầng 200x200`)).toBe(mids)
    // Một dầm kiềng ở mỗi sàn trên 1F, cộng dầm kiềng mái.
    expect(count(out, '*Dầm bê tông')).toBe(f.levels.length - 1 + 1)
    expect(count(out, '*Dầm bê tông 200 x 400')).toBe(1)
    expect(count(out, '*Dầm đầu cửa')).toBe(
      f.levels.filter((l) => l.door).length,
    )
    expect(sideColumnNotes(p, f)).toHaveLength(2 + mids + f.levels.length - 1)
  })

  it('không tầng nào có cửa → không có ghi chú dầm đầu cửa', () => {
    const p = clone()
    for (const fl of p.floors) fl.hasDoor = false
    expect(count(draw(p), '*Dầm đầu cửa')).toBe(0)
  })
})

describe('chữ trên trang không chồng nhau', () => {
  const cases: Array<[string, (p: ElevatorParams) => void]> = [
    ['mặc định', () => {}],
    ['buồng trên 500', (p) => void (p.tech.topRoomHeight = 500)],
    ['buồng trên 2500', (p) => void (p.tech.topRoomHeight = 2500)],
    ['OH 4500', (p) => void (p.tech.overhead = 4500)],
    [
      'móc sát vách trái / tường trước',
      (p) => {
        p.topRoom.hook.x = 80
        p.topRoom.hook.y = 80
      },
    ],
    [
      'móc sát vách phải / tường sau',
      (p) => {
        p.topRoom.hook.x = p.tech.shaft.width - 80
        p.topRoom.hook.y = p.tech.shaft.depth - 80
      },
    ],
    ['kiểu đỡ sàn', (p) => void (p.topRoom.machineSupport = 'floor')],
    ['BH 1300', (p) => void (p.tech.shaft.depth = 1300)],
    [
      'dầm kiềng mái thấp 150, móc sát tường trước, tải 1,5',
      (p) => {
        p.structure.ringBeamTop.h = 150
        p.topRoom.hook.y = 80
        p.topRoom.hook.loadTon = 1.5
      },
    ],
    [
      'dầm kiềng sàn 500, lỗ chờ 2400 + dầm đầu cửa 300',
      (p) => {
        p.structure.ringBeamFloor.h = 500
        p.structure.roughOpeningHeight = 2400
        p.structure.doorHeadBeam.h = 300
      },
    ],
  ]
  for (const id of ['house-5f', 'hotel-9f'] as const) {
    it.each(cases)(`${id}: %s`, (_n, mut) => {
      const p = clone(id)
      mut(p)
      expect(overlaps(draw(p))).toEqual([])
    })
    it.each([2, 3, 4, 5, 9, 20])(`${id}: N = %i`, (n) => {
      expect(overlaps(draw(withFloors(id, n)))).toEqual([])
    })
  }
})

describe('chi tiết móc palăng', () => {
  it('số a, a, b và Ø lấy từ form', () => {
    const p = clone()
    const ws = words(draw(p))
    const { bar, a, b } = p.topRoom.hoistDetail
    expect(ws).toContain(`Sắt Ø${bar}`)
    expect(ws).toContain('Móc treo Palăng 2 tấn')
    expect(ws).toContain('Khách hàng thực hiện')
    expect(ws).toContain(String(b))
    expect(ws.filter((w) => w === String(a)).length).toBeGreaterThanOrEqual(2)
  })

  it('đổi a, b, Ø: chỉ đổi số, hình giữ nguyên', () => {
    const p = clone()
    const q = clone()
    q.topRoom.hoistDetail = { bar: 20, a: 250, b: 1800 }
    const [dp, dq] = [draw(p), draw(q)]
    const ws = words(dq)
    expect(ws).toContain('Sắt Ø20')
    expect(ws.filter((w) => w === '250')).toHaveLength(2)
    expect(ws).toContain('1800')
    const shape = (out: Array<Prim>) => out.filter((x) => x.kind !== 'text')
    expect(shape(dq)).toHaveLength(shape(dp).length)
  })
})

describe('bảng chiều cao tầng', () => {
  // View 1:1 at the origin: sizes come back in real mm.
  const v: View = { n: 1, scale: 1, origin: { x: 0, y: 0 } }
  const rowsOf = (out: Array<Prim>) => {
    // Horizontal rules of the table, top to bottom.
    const ys = out
      .filter((q) => q.kind === 'line' && q.a.y === q.b.y)
      .map((q) => (q.kind === 'line' ? q.a.y : 0))
    return [...new Set(ys)].sort((a, b) => a - b)
  }

  it('dòng đầu "Chiều cao các tầng", không có tiêu đề; dòng OH và PIT', () => {
    const p = clone()
    const ws = words(draw(p))
    expect(ws).toContain(HEIGHT_TABLE_HEADER)
    expect(ws).not.toContain('CHIỀU CAO TẦNG THỰC TẾ')
    expect(ws).toContain('5F (OH)')
    expect(ws).toContain('4800 (3600 + 1200)')
    expect(ws).toContain('PIT')
  })

  it('tầng chưa nhập chiều cao in "......."', () => {
    const p = clone('hotel-9f')
    const d = derive(p)
    const empty = d.heightRows.slice(1).filter((r) => r.value === null).length
    expect(empty).toBeGreaterThan(0)
    expect(count(draw(p), NO_HEIGHT)).toBe(empty)
  })

  it('ít dòng: cao dòng 700, dòng đầu 750', () => {
    const p = clone()
    const d = derive(p)
    const ys = rowsOf(heightTable(p, d, sectionLevels(p, d), v))
    expect(ys).toHaveLength(d.heightRows.length + 2)
    expect(ys[1] - ys[0]).toBeCloseTo(SECTION.table.header, 6)
    expect(ys[2] - ys[1]).toBeCloseTo(SECTION.table.row, 6)
  })

  it('nhiều dòng (20 tầng cao khác nhau): dòng co lại nhưng không dưới 300', () => {
    const p = withFloors('house-5f', 20)
    p.floors.forEach((fl, i) => (fl.height = 3000 + i * 10))
    const d = derive(p)
    const ys = rowsOf(heightTable(p, d, sectionLevels(p, d), v))
    const row = ys[2] - ys[1]
    expect(row).toBeLessThan(SECTION.table.row)
    expect(row).toBeGreaterThanOrEqual(SECTION.table.minRow - 1e-9)
  })
})

describe('ghi chú dẫn: vị trí và mũi tên (hình 1:1)', () => {
  const v: View = { n: 1, scale: 1, origin: { x: 0, y: 0 } }
  const setup = (p: ElevatorParams) => {
    const d = derive(p)
    const f = sectionLevels(p, d)
    return { d, f, e: sectionEquipment(p, d, f) }
  }
  const lineEnds = (out: Array<Prim>, x: number, y: number) =>
    out.filter(
      (q) =>
        q.kind === 'line' &&
        Math.abs(q.b.x - x) < 1e-6 &&
        Math.abs(q.b.y - y) < 1e-6,
    )
  const star = (out: Array<Prim>, w: string) =>
    texts(out).find((t) => t.text === w)!

  it('móc còn chỗ bên trái: ghi chú bên trái móc, dây dẫn đi từ cuối gạch chân', () => {
    const p = clone()
    p.topRoom.hook.x = 1450
    const { f, e } = setup(p)
    const out = frontNotes(p, f, e, v)
    const t = star(out, '*Móc treo tải 2 tấn')
    const K = SECTION.hookNote
    const size = cadSize(v, SECTION.text.note)
    const [x0, x1] = textSpan(t)
    expect(x1).toBeCloseTo(e.front.hook.x - K.gap, 6)
    expect(x0).toBeLessThan(x1)
    expect(t.y).toBeCloseTo(-(f.roofTop + K.above) - UNDERLINE_DROP * size, 6)
    const hits = lineEnds(
      out,
      e.front.hook.x + K.target.x,
      e.front.hook.y + K.target.down,
    )
    expect(hits).toHaveLength(1)
    const l = hits[0]
    if (l.kind !== 'line') throw new Error('line')
    expect(l.a.x).toBeCloseTo(x1, 6) // attach = end
    expect(measure(t.text, size)).toBeCloseTo(x1 - x0, 6)
  })

  it('móc sát vách trái: ghi chú đổi sang bên phải, dây dẫn đi từ đầu gạch chân', () => {
    const p = clone()
    p.topRoom.hook.x = 80
    const { f, e } = setup(p)
    const K = SECTION.hookNote
    const out = frontNotes(p, f, e, v)
    const t = star(out, '*Móc treo tải 2 tấn')
    const [x0] = textSpan(t)
    expect(x0).toBeCloseTo(e.front.hook.x + K.gap, 6)
    // Không lấn ra ngoài mặt ngoài vách trái.
    expect(x0).toBeGreaterThan(-p.structure.wall)
    const hits = lineEnds(
      out,
      e.front.hook.x + K.target.x,
      e.front.hook.y + K.target.down,
    )
    expect(hits).toHaveLength(1)
    const l = hits[0]
    if (l.kind !== 'line') throw new Error('line')
    expect(l.a.x).toBeCloseTo(x0, 6) // attach = start
  })

  it('hook ở mặt cắt bên: sát vách trước cũng đổi bên phải', () => {
    const p = clone()
    p.topRoom.hook.y = 60
    const { f, e } = setup(p)
    const out = sideNotes(p, f, e, v)
    const t = star(out, '*Móc treo tải 2 tấn')
    expect(textSpan(t)[0]).toBeCloseTo(e.side.hook.x + SECTION.hookNote.gap, 6)
  })

  it('ghi chú cột phải: mũi tên chạm giữa dầm, trong tường sau lẫn dải qua hố', () => {
    const p = clone()
    const { f, e } = setup(p)
    const out = sideNotes(p, f, e, v)
    const BH = p.tech.shaft.depth
    const W = p.structure.wall
    const notes = sideColumnNotes(p, f)
    expect(notes.length).toBeGreaterThan(3)
    for (const n of notes) {
      const y = -(n.beam[0] + n.beam[1]) / 2
      expect(lineEnds(out, BH + W / 2, y).length).toBeGreaterThanOrEqual(1)
      expect(
        lineEnds(out, BH - SECTION.notes.band, y).length,
      ).toBeGreaterThanOrEqual(1)
    }
  })

  it('ghi chú dầm đầu cửa: chữ kết thúc cách mặt ngoài tường 187, mũi tên vào giữa dầm', () => {
    const p = clone()
    const { f, e } = setup(p)
    const out = sideNotes(p, f, e, v)
    const W = p.structure.wall
    const H = p.structure.roughOpeningHeight
    const head = p.structure.doorHeadBeam
    const withDoor = f.levels.filter((l) => l.door)
    const ts = texts(out).filter((t) => t.text === '*Dầm đầu cửa')
    expect(ts).toHaveLength(withDoor.length)
    for (const l of withDoor) {
      const y = -(l.floor + H + head.h / 2)
      const hit = lineEnds(out, -W, y)
      expect(hit).toHaveLength(1)
      const size = cadSize(v, SECTION.text.note)
      const base =
        -(l.floor + H + head.h + SECTION.doorNote.above) - UNDERLINE_DROP * size
      const t = ts.find((q) => Math.abs(q.y - base) < 1e-6)!
      expect(t).toBeDefined()
      expect(SECTION.doorNote.end).toBe(187)
      expect(textSpan(t)[1]).toBeCloseTo(-W - 187, 6)
    }
  })
})

describe('chi tiết móc palăng: vị trí cố định', () => {
  const v: View = { n: 1, scale: 1, origin: { x: 0, y: 0 } }
  const st = dimStyle(40, { arrow: 40, arrowWidth: 10, gap: 20 })
  const detail = (p: ElevatorParams) => {
    const d = derive(p)
    return hookDetail(p, sectionLevels(p, d), v, st)
  }

  it('đổi OH hoặc chiều cao buồng trên: hình không dịch', () => {
    const base = detail(clone())
    const a = clone()
    a.tech.overhead = 4500
    const b = clone()
    b.tech.topRoomHeight = 2000
    expect(detail(a)).toEqual(base)
    expect(detail(b)).toEqual(base)
  })

  it('neo theo vách phải hình trước: đổi BH không dịch, đổi AH dịch đúng ΔAH', () => {
    const base = detail(clone())
    const deeper = clone()
    deeper.tech.shaft.depth += 500
    expect(detail(deeper)).toEqual(base)
    const wider = clone()
    wider.tech.shaft.width += 200
    const xs = (out: Array<Prim>) => texts(out).map((t) => t.x)
    xs(detail(wider)).forEach((x, i) =>
      expect(x - xs(base)[i]).toBeCloseTo(200, 6),
    )
  })
})

describe('bảng chiều cao: dòng tách', () => {
  it('tầng trong nhóm cao khác nhau: tách từng dòng, không gộp "2F-3F"', () => {
    const p = withFloors('house-5f', 5)
    p.floors[1].height = 3600
    p.floors[2].height = 3700
    const ws = words(draw(p))
    expect(ws).toContain('2F')
    expect(ws).toContain('3F')
    expect(ws).toContain('3600')
    expect(ws).toContain('3700')
    expect(ws).not.toContain('2F-3F')
  })

  it('cao bằng nhau thì gộp một dòng "2F-3F"', () => {
    const p = withFloors('house-5f', 5)
    p.floors[1].height = 3600
    p.floors[2].height = 3600
    const ws = words(draw(p))
    expect(ws).toContain('2F-3F')
    expect(ws).not.toContain('3F')
  })

  it('số dòng bảng tăng thêm 1 khi nhóm tách', () => {
    const v: View = { n: 1, scale: 1, origin: { x: 0, y: 0 } }
    const rules = (p: ElevatorParams) => {
      const d = derive(p)
      const ys = heightTable(p, d, sectionLevels(p, d), v)
        .filter((q) => q.kind === 'line' && q.a.y === q.b.y)
        .map((q) => (q.kind === 'line' ? q.a.y : 0))
      return new Set(ys).size
    }
    const same = withFloors('house-5f', 5)
    same.floors[1].height = 3600
    same.floors[2].height = 3600
    const diff = withFloors('house-5f', 5)
    diff.floors[1].height = 3600
    diff.floors[2].height = 3700
    expect(rules(diff)).toBe(rules(same) + 1)
  })
})

describe('đường ngắt không cắt qua chữ ghi chú', () => {
  /** y của các nét ngắt: nét medium nằm ngang, đi thành cặp cách 0,8 mm. */
  const breakYs = (out: Array<Prim>) => {
    const ls = out.filter(
      (q): q is Extract<Prim, { kind: 'line' }> =>
        q.kind === 'line' && q.weight === 'medium' && q.a.y === q.b.y,
    )
    return ls
      .filter((a) =>
        ls.some(
          (b) =>
            a !== b &&
            a.a.x === b.a.x &&
            Math.abs(Math.abs(a.a.y - b.a.y) - 0.8) < 1e-6,
        ),
      )
      .map((a) => ({
        y: a.a.y,
        x0: Math.min(a.a.x, a.b.x),
        x1: Math.max(a.a.x, a.b.x),
      }))
  }
  const cases: Array<[string, (p: ElevatorParams) => void]> = [
    ['mặc định', () => {}],
    ['dầm kiềng sàn 500', (p) => void (p.structure.ringBeamFloor.h = 500)],
    [
      'lỗ chờ 2400 + dầm đầu cửa 300',
      (p) => {
        p.structure.roughOpeningHeight = 2400
        p.structure.doorHeadBeam.h = 300
      },
    ],
  ]
  for (const id of ['house-5f', 'hotel-9f'] as const)
    it.each(cases)(`${id}: %s`, (_n, mut) => {
      const p = clone(id)
      mut(p)
      const out = draw(p)
      const bs = breakYs(out)
      expect(bs.length).toBeGreaterThan(0)
      for (const t of texts(out)) {
        if (t.rotate) continue
        const b = box(t)
        for (const l of bs)
          expect(
            l.y > b.y0 && l.y < b.y1 && l.x0 < b.x1 && b.x0 < l.x1,
            `${t.text} @ ${l.y}`,
          ).toBe(false)
      }
    })
})
