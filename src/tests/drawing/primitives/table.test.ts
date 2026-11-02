import { describe, expect, it } from 'vitest'

import { table } from '#/drawing/primitives/table'
import type { TableRow } from '#/drawing/primitives/table'
import { ascent, descent, measure } from '#/drawing/text-metrics'
import type { LinePrim, Prim } from '#/drawing/types'
import { numbersOf, textSpan, texts } from '#/tests/drawing/helpers'

const SIZE = 3
const MIN = 2
const X = 10
const Y = 20
const COLS = [20, 30, 40] // mép cột: 10, 30, 60, 100

const base = (
  rows: Array<TableRow>,
  extra: Partial<Parameters<typeof table>[0]> = {},
) => table({ x: X, y: Y, cols: COLS, rows, size: SIZE, minSize: MIN, ...extra })

const linesOf = (ps: Array<Prim>) =>
  ps.filter((p): p is LinePrim => p.kind === 'line')
const hRules = (ps: Array<Prim>) => linesOf(ps).filter((l) => l.a.y === l.b.y)
const vRules = (ps: Array<Prim>) => linesOf(ps).filter((l) => l.a.x === l.b.x)

const ROWS: Array<TableRow> = [
  {
    h: 8,
    cells: [{ text: 'Tầng' }, { text: 'Chiều cao' }, { text: 'Ghi chú' }],
  },
  { h: 10, cells: [{ text: '1F' }, { text: '3900' }, { text: '' }] },
]

describe('table: đường kẻ', () => {
  const out = base(ROWS)

  it('đường ngang: rows + 1 đường, toàn bề rộng, tại đúng y', () => {
    const h = hRules(out)
    expect(h).toHaveLength(3)
    expect(h.map((l) => l.a.y).sort((a, b) => a - b)).toEqual([20, 28, 38])
    for (const l of h) {
      expect(Math.min(l.a.x, l.b.x)).toBe(10)
      expect(Math.max(l.a.x, l.b.x)).toBe(100)
    }
  })

  it('đường dọc: mỗi hàng có 4 vạch (trái, 2 giữa, phải), đúng cao bằng hàng', () => {
    const v = vRules(out)
    expect(v).toHaveLength(8)
    const row1 = v.filter((l) => Math.min(l.a.y, l.b.y) === 20)
    expect(row1.map((l) => l.a.x).sort((a, b) => a - b)).toEqual([
      10, 30, 60, 100,
    ])
    for (const l of row1) expect(Math.max(l.a.y, l.b.y)).toBe(28)
    const row2 = v.filter((l) => Math.min(l.a.y, l.b.y) === 28)
    expect(row2.map((l) => l.a.x).sort((a, b) => a - b)).toEqual([
      10, 30, 60, 100,
    ])
    for (const l of row2) expect(Math.max(l.a.y, l.b.y)).toBe(38)
  })

  it('weight truyền xuống mọi đường kẻ', () => {
    for (const l of linesOf(base(ROWS, { weight: 'medium' })))
      expect(l.weight).toBe('medium')
  })

  it('không có hàng nào → chỉ đường ngang trên cùng', () => {
    const empty = base([])
    expect(empty).toHaveLength(1)
    expect(hRules(empty)[0].a.y).toBe(20)
  })
})

describe('table: ô gộp cột (span)', () => {
  const rows: Array<TableRow> = [
    { h: 8, cells: [{ text: 'a' }, { text: 'b' }, { text: 'c' }] },
    { h: 8, cells: [{ text: 'Tầng 2~3', span: 2 }, { text: 'c' }] },
    { h: 8, cells: [{ text: 'Cả hàng', span: 3 }] },
  ]
  const out = base(rows)
  const xsOfRow = (top: number) =>
    vRules(out)
      .filter((l) => Math.min(l.a.y, l.b.y) === top)
      .map((l) => l.a.x)
      .sort((a, b) => a - b)

  it('hàng thường có vạch ở mọi mép cột', () => {
    expect(xsOfRow(20)).toEqual([10, 30, 60, 100])
  })

  it('ô span 2: không có vạch dọc ở giữa hai cột bị gộp (x = 30)', () => {
    expect(xsOfRow(28)).toEqual([10, 60, 100])
  })

  it('ô span 3: chỉ còn vạch hai mép ngoài', () => {
    expect(xsOfRow(36)).toEqual([10, 100])
  })

  it('chữ ô gộp canh giữa trọn vùng đã gộp', () => {
    const t = texts(out).find((x) => x.text === 'Tầng 2~3')!
    expect(t.anchor).toBe('middle')
    expect(t.x).toBeCloseTo((10 + 60) / 2, 9)
    const all = texts(out).find((x) => x.text === 'Cả hàng')!
    expect(all.x).toBeCloseTo((10 + 100) / 2, 9)
  })

  it('span lớn hơn số cột còn lại bị chặn lại, ô thừa bị bỏ qua', () => {
    const o = base([
      {
        h: 8,
        cells: [{ text: 'x', span: 2 }, { text: 'y', span: 5 }, { text: 'z' }],
      },
    ])
    expect(texts(o).map((t) => t.text)).toEqual(['x', 'y'])
    const y = texts(o).find((t) => t.text === 'y')!
    expect(y.x).toBeCloseTo((60 + 100) / 2, 9)
    expect(
      vRules(o)
        .map((l) => l.a.x)
        .sort((a, b) => a - b),
    ).toEqual([10, 60, 100])
  })

  it('span 0 hoặc âm được coi là 1', () => {
    const o = base([
      {
        h: 8,
        cells: [
          { text: 'a', span: 0 },
          { text: 'b', span: -2 },
        ],
      },
    ])
    expect(texts(o).find((t) => t.text === 'a')!.x).toBeCloseTo(20, 9)
    expect(texts(o).find((t) => t.text === 'b')!.x).toBeCloseTo(45, 9)
  })
})

describe('table: chữ trong ô', () => {
  const out = base(ROWS)

  it('mỗi ô có chữ thì có một text anchor middle ở giữa cột', () => {
    const ts = texts(out)
    expect(ts.map((t) => t.text)).toEqual([
      'Tầng',
      'Chiều cao',
      'Ghi chú',
      '1F',
      '3900',
    ])
    const centres = [20, 45, 80]
    ts.slice(0, 3).forEach((t, i) => {
      expect(t.anchor).toBe('middle')
      expect(t.x).toBeCloseTo(centres[i], 9)
    })
  })

  it('ô trống không sinh chữ nhưng vẫn có vạch dọc', () => {
    expect(texts(out)).toHaveLength(5)
    expect(vRules(out)).toHaveLength(8)
  })

  it('chữ nằm trọn trong ô (textSpan trong [mép + pad, mép − pad])', () => {
    const edges = [10, 30, 60, 100]
    for (const t of texts(out)) {
      const [lo, hi] = textSpan(t)
      const c = edges.findIndex(
        (e, i) => i < 3 && t.x > e && t.x < edges[i + 1],
      )
      expect(lo).toBeGreaterThanOrEqual(edges[c] + 1 - 1e-6)
      expect(hi).toBeLessThanOrEqual(edges[c + 1] - 1 + 1e-6)
    }
  })

  it('baseline canh giữa theo chiều dọc: giữa hàng + (ascent − descent) / 2', () => {
    const t = texts(out).find((x) => x.text === 'Tầng')!
    expect(t.y).toBeCloseTo(20 + 4 + ascent(SIZE) / 2 - descent(SIZE) / 2, 9)
    const t2 = texts(out).find((x) => x.text === '1F')!
    expect(t2.y).toBeCloseTo(28 + 5 + ascent(SIZE) / 2 - descent(SIZE) / 2, 9)
  })

  it('chữ nằm trong chiều cao hàng', () => {
    for (const t of texts(out)) {
      const row = t.y < 28 ? [20, 28] : [28, 38]
      expect(t.y).toBeGreaterThan(row[0])
      expect(t.y).toBeLessThan(row[1])
    }
  })

  it('cell.bold → text bold', () => {
    const o = base([
      { h: 8, cells: [{ text: 'A', bold: true }, { text: 'B' }] },
    ])
    const ts = texts(o)
    expect(ts.find((t) => t.text === 'A')!.bold).toBe(true)
    expect(ts.find((t) => t.text === 'B')!.bold).toBeFalsy()
  })

  it('pad tùy chỉnh thay đổi vùng chữ', () => {
    // cột 20 rộng, chữ vừa khít 20 − 2×1 = 18 thì pad 5 phải co chữ.
    const w = measure('Tầng 12345', SIZE)
    const cols = [w + 2 + 0.01]
    const tight = table({
      x: 0,
      y: 0,
      cols,
      rows: [{ h: 8, cells: [{ text: 'Tầng 12345' }] }],
      size: SIZE,
      minSize: 0.5,
      pad: 5,
    })
    expect(texts(tight)[0].size).toBeLessThan(SIZE)
    const loose = table({
      x: 0,
      y: 0,
      cols,
      rows: [{ h: 8, cells: [{ text: 'Tầng 12345' }] }],
      size: SIZE,
      minSize: 0.5,
      pad: 1,
    })
    expect(texts(loose)[0].size).toBe(SIZE)
  })
})

describe('table: baseline theo cỡ chữ sau khi co', () => {
  it('chữ bị co: baseline canh giữa theo cỡ thật của prim text', () => {
    const text = 'Tầng 12345'
    const w = measure(text, SIZE)
    const out = table({
      x: 0,
      y: 5,
      cols: [w * 0.7 + 2],
      rows: [{ h: 12, cells: [{ text }] }],
      size: SIZE,
      minSize: 1,
    })
    const [t] = texts(out)
    expect(t.size).toBeLessThan(SIZE)
    expect(t.y).toBeCloseTo(5 + 6 + ascent(t.size) / 2 - descent(t.size) / 2, 9)
    // khác với công thức theo cỡ gốc
    expect(
      Math.abs(t.y - (5 + 6 + ascent(SIZE) / 2 - descent(SIZE) / 2)),
    ).toBeGreaterThan(1e-6)
  })

  it('chữ bị cắt "…" ở cỡ minSize: baseline theo minSize', () => {
    const out = table({
      x: 0,
      y: 0,
      cols: [20],
      rows: [
        { h: 10, cells: [{ text: 'Ghi chú rất dài không thể vừa ô hẹp' }] },
      ],
      size: SIZE,
      minSize: MIN,
    })
    const [t] = texts(out)
    expect(t.size).toBe(MIN)
    expect(t.y).toBeCloseTo(5 + ascent(MIN) / 2 - descent(MIN) / 2, 9)
  })

  it('ô vừa chữ: baseline theo cỡ gốc', () => {
    const [t] = texts(
      table({
        x: 0,
        y: 0,
        cols: [50],
        rows: [{ h: 10, cells: [{ text: 'Tầng' }] }],
        size: SIZE,
        minSize: MIN,
      }),
    )
    expect(t.size).toBe(SIZE)
    expect(t.y).toBeCloseTo(5 + ascent(SIZE) / 2 - descent(SIZE) / 2, 9)
  })
})

describe('table: chữ quá dài', () => {
  it('co cỡ chữ trước (không dưới minSize) khi chỉ hơi rộng', () => {
    const text = 'Tầng 12345'
    const w = measure(text, SIZE)
    // ô trong 0,8 × bề rộng chữ: cần co ~20%, còn ≥ MIN.
    const out = table({
      x: 0,
      y: 0,
      cols: [w * 0.8 + 2],
      rows: [{ h: 8, cells: [{ text }] }],
      size: SIZE,
      minSize: MIN,
    })
    const [t] = texts(out)
    expect(t.text).toBe(text)
    expect(t.size).toBeLessThan(SIZE)
    expect(t.size).toBeGreaterThanOrEqual(MIN)
    expect(t.size).toBeCloseTo(SIZE * 0.8, 6)
  })

  it('vẫn không vừa ở minSize → cắt bằng "…" và không tràn ô', () => {
    const text = 'Ghi chú rất dài không thể vừa trong một ô hẹp như thế này'
    const out = table({
      x: 0,
      y: 0,
      cols: [20],
      rows: [{ h: 8, cells: [{ text }] }],
      size: SIZE,
      minSize: MIN,
    })
    const [t] = texts(out)
    expect(t.text.endsWith('…')).toBe(true)
    expect(t.text.length).toBeLessThan(text.length)
    expect(t.size).toBe(MIN)
    const [lo, hi] = textSpan(t)
    expect(lo).toBeGreaterThanOrEqual(1 - 1e-6)
    expect(hi).toBeLessThanOrEqual(19 + 1e-6)
  })

  it('chữ 300 ký tự không vượt ra ngoài bảng', () => {
    const text = 'Địa chỉ dài '.repeat(25)
    const out = base([{ h: 8, cells: [{ text }, { text }, { text }] }])
    for (const t of texts(out)) {
      const [lo, hi] = textSpan(t)
      expect(lo).toBeGreaterThanOrEqual(10 - 1e-6)
      expect(hi).toBeLessThanOrEqual(100 + 1e-6)
    }
  })

  it('ô hẹp hơn 2 × pad: không ném lỗi, không ra NaN', () => {
    const out = table({
      x: 0,
      y: 0,
      cols: [1.5],
      rows: [{ h: 8, cells: [{ text: 'Tầng' }] }],
      size: SIZE,
      minSize: MIN,
    })
    for (const p of out)
      for (const n of numbersOf(p)) expect(Number.isFinite(n)).toBe(true)
  })
})

describe('table: ổn định', () => {
  it('mọi tọa độ hữu hạn; gọi 2 lần giống hệt', () => {
    const f = () => base(ROWS, { weight: 'thin' })
    const a = f()
    expect(f()).toEqual(a)
    for (const p of a)
      for (const n of numbersOf(p)) expect(Number.isFinite(n)).toBe(true)
  })
})
