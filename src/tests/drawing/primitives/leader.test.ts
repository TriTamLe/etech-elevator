import { describe, expect, it } from 'vitest'

import { UNDERLINE_DROP } from '#/drawing/prims'
import { DIM_RATIO } from '#/drawing/primitives/dimension'
import {
  LEADER_LINE_GAP,
  leader,
  noteExtent,
  stackNotes,
} from '#/drawing/primitives/leader'
import { ascent, descent, measure } from '#/drawing/text-metrics'
import type { LinePrim, PolylinePrim, Prim } from '#/drawing/types'
import { numbersOf, textSpan, texts } from '#/tests/drawing/helpers'

const SIZE = 4
const AT = { x: 100, y: 50 }
const LINES = ['Dầm bê tông 200 x 400', 'kiềng quanh hố thang']
const FIRST = `*${LINES[0]}`
const W = measure(FIRST, SIZE)
const CX = AT.x + W / 2

const linesOf = (ps: Array<Prim>) =>
  ps.filter((p): p is LinePrim => p.kind === 'line')
const arrowsOf = (ps: Array<Prim>) =>
  ps.filter((p): p is PolylinePrim => p.kind === 'polyline')

/** Gạch chân dòng 1 = đường ngang tại y = baseline + UNDERLINE_DROP·size. */
const underlineOf = (ps: Array<Prim>) =>
  linesOf(ps).find((l) => l.a.y === l.b.y && l.a.x !== l.b.x)!
/** Đường dẫn = đường còn lại (không phải gạch chân). */
const guideOf = (ps: Array<Prim>) =>
  linesOf(ps).find((l) => !(l.a.y === l.b.y && l.a.x !== l.b.x))!

describe('leader: chữ', () => {
  const target = { x: 60, y: 80 }
  const out = leader(target, AT, LINES, { size: SIZE })

  it('dòng 1 có "*" ở đầu, bắt đầu tại `at` (baseline, đầu trái)', () => {
    const [first] = texts(out)
    expect(first.text).toBe(FIRST)
    expect(first.x).toBe(AT.x)
    expect(first.y).toBe(AT.y)
    expect(first.size).toBe(SIZE)
    expect(first.anchor ?? 'start').toBe('start')
  })

  it('các dòng sau canh giữa tại tâm dòng 1, cách nhau LEADER_LINE_GAP × size', () => {
    const rest = texts(out).slice(1)
    expect(rest).toHaveLength(1)
    expect(rest[0].text).toBe(LINES[1])
    expect(rest[0].anchor).toBe('middle')
    expect(rest[0].x).toBeCloseTo(CX, 9)
    expect(rest[0].y).toBeCloseTo(AT.y + LEADER_LINE_GAP * SIZE, 9)
  })

  it('LEADER_LINE_GAP = 1,3 (đo từ bản vẽ mẫu)', () => {
    expect(LEADER_LINE_GAP).toBe(1.3)
  })

  it('nhiều dòng: dòng thứ i cách baseline đầu i × pitch', () => {
    const o = leader(target, AT, ['a', 'b', 'c', 'd'], { size: SIZE })
    const ts = texts(o)
    expect(ts.map((t) => t.text)).toEqual(['*a', 'b', 'c', 'd'])
    ts.slice(1).forEach((t, i) =>
      expect(t.y).toBeCloseTo(AT.y + (i + 1) * 1.3 * SIZE, 9),
    )
    // tất cả canh giữa quanh tâm của dòng đầu
    const cx = AT.x + measure('*a', SIZE) / 2
    for (const t of ts.slice(1)) expect(t.x).toBeCloseTo(cx, 9)
  })

  it('lineGap tùy chỉnh thay LEADER_LINE_GAP', () => {
    const o = leader(target, AT, LINES, { size: SIZE, lineGap: 2 })
    expect(texts(o)[1].y).toBeCloseTo(AT.y + 2 * SIZE, 9)
  })

  it('các dòng sau nằm cân đối quanh tâm dòng 1', () => {
    const [lo, hi] = textSpan(texts(out)[1])
    expect((lo + hi) / 2).toBeCloseTo(CX, 9)
  })
})

describe('leader: dấu "*" và dòng trống', () => {
  const target = { x: 60, y: 80 }

  it('star: false → dòng 1 không có "*", gạch chân đo theo dòng không có "*"', () => {
    const o = leader(target, AT, LINES, { size: SIZE, star: false })
    expect(texts(o)[0].text).toBe(LINES[0])
    const u = underlineOf(o)
    expect(Math.abs(u.b.x - u.a.x)).toBeCloseTo(measure(LINES[0], SIZE), 9)
  })

  it('star mặc định là true', () => {
    expect(texts(leader(target, AT, LINES, { size: SIZE }))[0].text).toBe(FIRST)
    expect(
      texts(leader(target, AT, LINES, { size: SIZE, star: true }))[0].text,
    ).toBe(FIRST)
  })

  it('dòng trống/khoảng trắng bị bỏ, dòng còn lại được trim', () => {
    const o = leader(target, AT, ['  ', '  Dầm  ', '', 'sàn  '], { size: SIZE })
    expect(texts(o).map((t) => t.text)).toEqual(['*Dầm', 'sàn'])
    // dòng 2 đứng ngay dưới dòng 1 (không chừa chỗ cho dòng trống đã bỏ)
    expect(texts(o)[1].y).toBeCloseTo(AT.y + 1.3 * SIZE, 9)
  })

  it('mọi dòng rỗng hoặc không có dòng nào → []', () => {
    expect(leader(target, AT, [], { size: SIZE })).toEqual([])
    expect(leader(target, AT, ['', '   '], { size: SIZE })).toEqual([])
  })
})

describe('leader: gạch chân và đường dẫn', () => {
  const underlineY = AT.y + UNDERLINE_DROP * SIZE

  it('gạch chân dài bằng measure(dòng 1), nằm dưới baseline UNDERLINE_DROP × size', () => {
    const u = underlineOf(leader({ x: 60, y: 80 }, AT, LINES, { size: SIZE }))
    expect(u.a.y).toBeCloseTo(underlineY, 9)
    expect(Math.min(u.a.x, u.b.x)).toBeCloseTo(AT.x, 9)
    expect(Math.max(u.a.x, u.b.x)).toBeCloseTo(AT.x + W, 9)
    expect(Math.abs(u.b.x - u.a.x)).toBeCloseTo(measure(FIRST, SIZE), 9)
  })

  it('target bên trái tâm: đường dẫn xuất phát từ đầu TRÁI gạch chân', () => {
    const target = { x: 60, y: 80 }
    const g = guideOf(leader(target, AT, LINES, { size: SIZE }))
    expect(g.a).toEqual({ x: AT.x, y: underlineY })
    expect(g.b).toEqual(target)
    expect(g.weight).toBe('thin')
  })

  it('target bên phải tâm: đường dẫn xuất phát từ đầu PHẢI gạch chân', () => {
    const target = { x: AT.x + W + 30, y: 20 }
    const g = guideOf(leader(target, AT, LINES, { size: SIZE }))
    expect(g.a.x).toBeCloseTo(AT.x + W, 9)
    expect(g.a.y).toBeCloseTo(underlineY, 9)
    expect(g.b).toEqual(target)
  })

  const ONE = [LINES[0]]

  it('1 dòng, target DƯỚI gạch chân, x trong khoảng chữ: kẻ thẳng đứng từ gạch chân', () => {
    for (const x of [AT.x + 1, CX - 1, CX, CX + 1, AT.x + W - 1]) {
      const g = guideOf(leader({ x, y: 80 }, AT, ONE, { size: SIZE }))
      expect(g.a.x).toBeCloseTo(x, 9)
      expect(g.a.y).toBeCloseTo(underlineY, 9)
      expect(g.b).toEqual({ x, y: 80 })
    }
  })

  it('1 dòng, target dưới nhưng ngoài khoảng chữ: kẹp vào đầu gạch chân gần nhất', () => {
    const l = guideOf(leader({ x: AT.x - 5, y: 80 }, AT, ONE, { size: SIZE }))
    const r = guideOf(
      leader({ x: AT.x + W + 5, y: 80 }, AT, ONE, { size: SIZE }),
    )
    expect(l.a.x).toBeCloseTo(AT.x, 9)
    expect(r.a.x).toBeCloseTo(AT.x + W, 9)
  })

  it('target PHÍA TRÊN gạch chân (x trong khoảng chữ): ra đầu gần hơn theo tâm, không kẻ xuyên chữ', () => {
    for (const lines of [ONE, LINES]) {
      const left = guideOf(
        leader({ x: CX - 1, y: 10 }, AT, lines, { size: SIZE }),
      )
      const right = guideOf(
        leader({ x: CX + 1, y: 10 }, AT, lines, { size: SIZE }),
      )
      expect(left.a.x).toBeCloseTo(AT.x, 9)
      expect(right.a.x).toBeCloseTo(AT.x + W, 9)
    }
  })

  it('ghi chú NHIỀU dòng, target dưới trong khoảng chữ: ra đầu gần hơn (tránh dòng sau)', () => {
    const left = guideOf(
      leader({ x: CX - 1, y: 90 }, AT, LINES, { size: SIZE }),
    )
    const right = guideOf(
      leader({ x: CX + 1, y: 90 }, AT, LINES, { size: SIZE }),
    )
    expect(left.a.x).toBeCloseTo(AT.x, 9)
    expect(right.a.x).toBeCloseTo(AT.x + W, 9)
  })

  it("attach: 'start' / 'end' ép đầu gạch chân bất kể vị trí target", () => {
    for (const t of [
      { x: CX + 10, y: 90 },
      { x: CX - 10, y: 10 },
      { x: AT.x + W + 50, y: 90 },
    ]) {
      const s = guideOf(leader(t, AT, ONE, { size: SIZE, attach: 'start' }))
      const e = guideOf(leader(t, AT, LINES, { size: SIZE, attach: 'end' }))
      expect(s.a.x).toBeCloseTo(AT.x, 9)
      expect(s.a.y).toBeCloseTo(underlineY, 9)
      expect(e.a.x).toBeCloseTo(AT.x + W, 9)
      expect(e.b).toEqual(t)
    }
  })

  it("attach: 'nearest' tường minh giống mặc định", () => {
    const t = { x: CX + 3, y: 80 }
    expect(leader(t, AT, ONE, { size: SIZE, attach: 'nearest' })).toEqual(
      leader(t, AT, ONE, { size: SIZE }),
    )
  })
})

describe('leader: nhiều điểm chỉ', () => {
  const targets = [
    { x: 60, y: 80 },
    { x: CX, y: 90 },
    { x: AT.x + W + 40, y: 70 },
  ]
  const underlineY = AT.y + UNDERLINE_DROP * SIZE
  const ONE = [LINES[0]]
  const out = leader(targets, AT, ONE, { size: SIZE })
  const guides = linesOf(out).filter((l) => l !== underlineOf(out))

  it('mỗi điểm một đường dẫn mảnh, xuất phát từ gạch chân', () => {
    expect(guides).toHaveLength(3)
    guides.forEach((g, i) => {
      expect(g.weight).toBe('thin')
      expect(g.a.y).toBeCloseTo(underlineY, 9)
      expect(g.b).toEqual(targets[i])
      expect(g.a.x).toBeGreaterThanOrEqual(AT.x - 1e-9)
      expect(g.a.x).toBeLessThanOrEqual(AT.x + W + 1e-9)
    })
  })

  it('ghi chú 1 dòng, các điểm dưới gạch chân: trái/phải kẹp vào đầu, điểm giữa kẻ thẳng đứng', () => {
    expect(guides[0].a.x).toBeCloseTo(AT.x, 9)
    expect(guides[1].a.x).toBeCloseTo(CX, 9)
    expect(guides[2].a.x).toBeCloseTo(AT.x + W, 9)
  })

  it('mỗi điểm một mũi tên, đỉnh trùng điểm chỉ', () => {
    const arrows = arrowsOf(out)
    expect(arrows).toHaveLength(3)
    arrows.forEach((a, i) => expect(a.pts[0]).toEqual(targets[i]))
  })

  it("head: 'none' → không mũi tên nhưng vẫn đủ 3 đường dẫn", () => {
    const o = leader(targets, AT, ONE, { size: SIZE, head: 'none' })
    expect(arrowsOf(o)).toHaveLength(0)
    expect(linesOf(o)).toHaveLength(4)
  })

  it('chữ và gạch chân chỉ vẽ một lần', () => {
    expect(texts(out)).toHaveLength(1)
    expect(linesOf(out).filter((l) => l.a.y === l.b.y)).toHaveLength(1)
  })

  it('điểm không hữu hạn bị bỏ, các điểm còn lại giữ nguyên', () => {
    const o = leader([{ x: NaN, y: 1 }, targets[0]], AT, ONE, { size: SIZE })
    expect(linesOf(o)).toHaveLength(2)
    expect(arrowsOf(o)).toHaveLength(1)
  })

  it('mảng rỗng → chỉ chữ và gạch chân', () => {
    const o = leader([], AT, ONE, { size: SIZE })
    expect(texts(o)).toHaveLength(1)
    expect(linesOf(o)).toHaveLength(1)
    expect(arrowsOf(o)).toHaveLength(0)
  })
})

describe('leader: đầu mũi tên', () => {
  const target = { x: 60, y: 80 }
  const arrowLen = DIM_RATIO.arrow * SIZE

  it('mặc định head = arrow: 1 polygon kín tô đặc, đỉnh trùng target', () => {
    const [a, ...more] = arrowsOf(leader(target, AT, LINES, { size: SIZE }))
    expect(more).toHaveLength(0)
    expect(a.closed).toBe(true)
    expect(a.fill).toBe('ink')
    expect(a.pts).toHaveLength(3)
    expect(a.pts[0]).toEqual(target)
  })

  it('mũi tên dài DIM_RATIO.arrow × size, quay về phía đường dẫn', () => {
    const o = leader(target, AT, LINES, { size: SIZE })
    const [a] = arrowsOf(o)
    const g = guideOf(o)
    const mid = {
      x: (a.pts[1].x + a.pts[2].x) / 2,
      y: (a.pts[1].y + a.pts[2].y) / 2,
    }
    expect(Math.hypot(mid.x - target.x, mid.y - target.y)).toBeCloseTo(
      arrowLen,
      9,
    )
    // Đáy nằm trên đường dẫn: (mid − from) song song (target − from).
    const cross =
      (mid.x - g.a.x) * (target.y - g.a.y) -
      (mid.y - g.a.y) * (target.x - g.a.x)
    expect(cross).toBeCloseTo(0, 9)
    // và gần `from` hơn target
    expect(Math.hypot(mid.x - g.a.x, mid.y - g.a.y)).toBeLessThan(
      Math.hypot(target.x - g.a.x, target.y - g.a.y),
    )
  })

  it("head: 'none' → không có polygon, vẫn có đường dẫn", () => {
    const o = leader(target, AT, LINES, { size: SIZE, head: 'none' })
    expect(arrowsOf(o)).toHaveLength(0)
    expect(guideOf(o).b).toEqual(target)
  })

  it('target không hữu hạn → chỉ còn chữ và gạch chân, không đường dẫn/mũi tên', () => {
    const o = leader({ x: NaN, y: 10 }, AT, LINES, { size: SIZE })
    expect(texts(o)).toHaveLength(2)
    expect(linesOf(o)).toHaveLength(1)
    expect(arrowsOf(o)).toHaveLength(0)
  })
})

describe('leader: ổn định', () => {
  it('mọi tọa độ hữu hạn; gọi 2 lần giống hệt', () => {
    const f = () =>
      leader({ x: 300, y: 10 }, AT, ['Dầm bê tông', 'kiềng', 'hố thang'], {
        size: 3.5,
      })
    const a = f()
    expect(f()).toEqual(a)
    for (const p of a)
      for (const n of numbersOf(p)) expect(Number.isFinite(n)).toBe(true)
  })
})

describe('noteExtent', () => {
  it('1 dòng: trên gạch chân là dòng đầu, dưới chỉ còn chân chữ lòi qua gạch chân', () => {
    expect(noteExtent(1, SIZE)).toEqual({
      above: UNDERLINE_DROP * SIZE + ascent(SIZE),
      below: descent(SIZE) - UNDERLINE_DROP * SIZE,
    })
  })

  it('n dòng: dưới gạch chân là (n − 1) bước dòng cộng phần chân chữ', () => {
    const e = noteExtent(3, SIZE)
    expect(e.below).toBeCloseTo(
      2 * LEADER_LINE_GAP * SIZE + descent(SIZE) - UNDERLINE_DROP * SIZE,
      9,
    )
  })
})

describe('stackNotes', () => {
  const n = (y: number, above = 2, below = 6) => ({ y, above, below })

  it('không chạm: giữ nguyên vị trí mong muốn', () => {
    expect(stackNotes([n(10), n(30), n(60)], 1)).toEqual([10, 30, 60])
  })

  it('chạm: đẩy xuống vừa đủ cách ghi chú trên một khoảng gap', () => {
    // Note 1 ends at 10 + 6 = 16; note 2 needs its top (y − 2) ≥ 16 + 1.
    expect(stackNotes([n(10), n(12)], 1)).toEqual([10, 19])
  })

  it('đẩy dây chuyền: ghi chú thứ ba bị đẩy theo ghi chú thứ hai', () => {
    expect(stackNotes([n(10), n(12), n(20)], 1)).toEqual([10, 19, 28])
  })

  it('đầu vào lộn thứ tự: xếp theo y, trả về theo thứ tự đầu vào', () => {
    expect(stackNotes([n(12), n(10)], 1)).toEqual([19, 10])
  })

  it('cùng y: giữ thứ tự đầu vào', () => {
    expect(stackNotes([n(10), n(10)], 1)).toEqual([10, 19])
  })

  it('không đổi mảng đầu vào; mảng rỗng → rỗng', () => {
    const input = [n(12), n(10)]
    const copy = structuredClone(input)
    stackNotes(input, 1)
    expect(input).toEqual(copy)
    expect(stackNotes([], 1)).toEqual([])
  })
})
