import { describe, expect, it } from 'vitest'

import {
  DIM_RATIO,
  dim,
  dimChain,
  dimStyle,
  plainLabel,
  prefixLabel,
} from '#/drawing/primitives/dimension'
import { view } from '#/drawing/primitives/view'
import { measure } from '#/drawing/text-metrics'
import type { LinePrim, Prim, PolylinePrim } from '#/drawing/types'
import { numbersOf, textSpan, texts } from '#/tests/drawing/helpers'

const SIZE = 3
const S = dimStyle(SIZE)
/** 1:50, gốc thật (0, 0) đặt tại (100, 100) trên giấy. */
const V = view(50, { x: 100, y: 100 })

const linesOf = (ps: Array<Prim>) =>
  ps.filter((p): p is LinePrim => p.kind === 'line')
const arrowsOf = (ps: Array<Prim>) =>
  ps.filter((p): p is PolylinePrim => p.kind === 'polyline')
/** Đường kích thước ngang: a.y = b.y. */
const hLines = (ps: Array<Prim>) => linesOf(ps).filter((l) => l.a.y === l.b.y)
/** Đường gióng của dim ngang: a.x = b.x. */
const vLines = (ps: Array<Prim>) => linesOf(ps).filter((l) => l.a.x === l.b.x)

const A = { x: 0, y: 0 }
const B = { x: 1500, y: 0 }

describe('dimStyle', () => {
  it('các phần tính theo cỡ chữ với tỷ lệ DIM_RATIO', () => {
    const s = dimStyle(4)
    expect(s.text).toBe(4)
    expect(s.arrow).toBeCloseTo(DIM_RATIO.arrow * 4, 12)
    expect(s.arrowWidth).toBeCloseTo(s.arrow / 3, 12)
    expect(s.gap).toBeCloseTo(DIM_RATIO.gap * 4, 12)
    expect(s.extOffset).toBe(0)
    expect(s.extBeyond).toBeCloseTo(DIM_RATIO.extBeyond * 4, 12)
    expect(s.head).toBe('arrow')
    expect(s.weight).toBe('thin')
  })

  it('tỷ lệ chốt theo DWG: arrow 0,34 · gap 0,17 · extBeyond 0,3 · extOffset 0', () => {
    expect(DIM_RATIO.arrow).toBe(0.34)
    expect(DIM_RATIO.gap).toBe(0.17)
    expect(DIM_RATIO.extBeyond).toBe(0.3)
    expect(DIM_RATIO.extOffset).toBe(0)
  })

  it('overrides ghi đè đúng trường, giữ nguyên phần còn lại', () => {
    const s = dimStyle(3, { head: 'tick', weight: 'medium', gap: 9 })
    expect(s.head).toBe('tick')
    expect(s.weight).toBe('medium')
    expect(s.gap).toBe(9)
    expect(s.arrow).toBeCloseTo(0.34 * 3, 12)
  })
})

describe('plainLabel / prefixLabel', () => {
  it('plainLabel làm tròn, không dấu phân cách hàng nghìn', () => {
    expect(plainLabel(1500)).toBe('1500')
    expect(plainLabel(1499.5)).toBe('1500')
    expect(plainLabel(1499.4)).toBe('1499')
    expect(plainLabel(20900)).toBe('20900')
    expect(plainLabel(0)).toBe('0')
  })

  it('prefixLabel nối tiền tố với giá trị đã làm tròn', () => {
    expect(prefixLabel('Chiều rộng = ')(1500)).toBe('Chiều rộng = 1500')
    expect(prefixLabel('LỖ CHỜ = ')(899.6)).toBe('LỖ CHỜ = 900')
  })
})

describe('dim ngang: bố cục', () => {
  const out = dim(V, A, B, { dir: 'h', offset: -10, style: S })

  it('gồm 2 đường gióng + 1 đường kích thước + 2 mũi tên + 1 chữ', () => {
    expect(linesOf(out)).toHaveLength(3)
    expect(arrowsOf(out)).toHaveLength(2)
    expect(texts(out)).toHaveLength(1)
    expect(out).toHaveLength(6)
  })

  it('giá trị in là khoảng cách thật (1500), không phải số đo trên giấy', () => {
    expect(texts(out)[0].text).toBe('1500')
  })

  it('offset âm: đường kích thước nằm trên điểm đo, cách 10 mm giấy', () => {
    const [line] = hLines(out)
    expect(line.a.y).toBeCloseTo(90, 9)
    expect(line.b.y).toBeCloseTo(90, 9)
  })

  it('đường kích thước chạy đúng từ điểm a đến điểm b (mũi tên trong)', () => {
    const [line] = hLines(out)
    expect(Math.min(line.a.x, line.b.x)).toBeCloseTo(100, 9)
    expect(Math.max(line.a.x, line.b.x)).toBeCloseTo(130, 9)
  })

  it('chữ canh giữa đoạn, nằm trên đường một khoảng gap (y nhỏ hơn)', () => {
    const t = texts(out)[0]
    expect(t.anchor).toBe('middle')
    expect(t.rotate).toBeUndefined()
    expect(t.size).toBe(SIZE)
    expect(t.x).toBeCloseTo(115, 9)
    expect(t.y).toBeCloseTo(90 - S.gap, 9)
  })

  it('đường gióng thẳng đứng tại x = 100 và 130, đi từ điểm đo qua đường kích thước extBeyond', () => {
    const ext = vLines(out).sort((p, q) => p.a.x - q.a.x)
    expect(ext.map((l) => l.a.x)).toEqual([100, 130])
    for (const l of ext) {
      expect(l.a.y).toBeCloseTo(100, 9) // bắt đầu tại điểm đo (extOffset = 0)
      expect(l.b.y).toBeCloseTo(90 - S.extBeyond, 9) // vượt đường kích thước
    }
  })

  it('mũi tên trong: đỉnh ở hai đầu, trỏ ra ngoài (đáy nằm phía trong)', () => {
    const [left, right] = arrowsOf(out).sort((p, q) => p.pts[0].x - q.pts[0].x)
    expect(left.pts[0].x).toBeCloseTo(100, 9)
    expect(left.pts[0].y).toBeCloseTo(90, 9)
    expect(left.pts[1].x).toBeCloseTo(100 + S.arrow, 9)
    expect(right.pts[0].x).toBeCloseTo(130, 9)
    expect(right.pts[1].x).toBeCloseTo(130 - S.arrow, 9)
    for (const a of [left, right]) {
      expect(a.closed).toBe(true)
      expect(a.fill).toBe('ink')
    }
  })

  it('nét theo style.weight (mặc định thin)', () => {
    for (const l of linesOf(out)) expect(l.weight).toBe('thin')
    const med = dim(V, A, B, {
      dir: 'h',
      offset: -10,
      style: dimStyle(SIZE, { weight: 'medium' }),
    })
    for (const l of linesOf(med)) expect(l.weight).toBe('medium')
  })
})

describe('dim ngang: offset dương và hai điểm lệch y', () => {
  it('offset dương: đường nằm dưới điểm đo, chữ vẫn ở trên đường', () => {
    const out = dim(V, A, B, { dir: 'h', offset: 10, style: S })
    const [line] = hLines(out)
    expect(line.a.y).toBeCloseTo(110, 9)
    const t = texts(out)[0]
    expect(t.y).toBeCloseTo(110 - S.gap, 9)
    // đường gióng đi xuống qua đường kích thước
    for (const l of vLines(out)) expect(l.b.y).toBeCloseTo(110 + S.extBeyond, 9)
  })

  it('tính offset từ điểm ngoài cùng: âm = trên điểm cao nhất, dương = dưới điểm thấp nhất', () => {
    const a = { x: 0, y: 0 }
    const b = { x: 1500, y: 500 } // trên giấy y = 100 và 110
    const up = hLines(dim(V, a, b, { dir: 'h', offset: -10, style: S }))[0]
    const down = hLines(dim(V, a, b, { dir: 'h', offset: 10, style: S }))[0]
    expect(up.a.y).toBeCloseTo(90, 9)
    expect(down.a.y).toBeCloseTo(120, 9)
  })

  it('đường gióng của điểm thấp hơn dài hơn, đều kết thúc cách đường extBeyond', () => {
    const a = { x: 0, y: 0 }
    const b = { x: 1500, y: 500 }
    const out = dim(V, a, b, { dir: 'h', offset: -10, style: S })
    const ext = vLines(out).sort((p, q) => p.a.x - q.a.x)
    expect(ext[0].a.y).toBeCloseTo(100, 9)
    expect(ext[1].a.y).toBeCloseTo(110, 9)
    for (const l of ext) expect(l.b.y).toBeCloseTo(90 - S.extBeyond, 9)
  })

  it('a ở bên phải b: cùng kết quả (giá trị luôn dương)', () => {
    const fwd = dim(V, A, B, { dir: 'h', offset: -10, style: S })
    const back = dim(V, B, A, { dir: 'h', offset: -10, style: S })
    expect(texts(back)[0].text).toBe('1500')
    expect(texts(back)[0].x).toBeCloseTo(texts(fwd)[0].x, 9)
  })
})

describe('dim đứng', () => {
  const a = { x: 0, y: 0 }
  const b = { x: 0, y: 1500 } // trên giấy (100, 100) → (100, 130)
  const out = dim(V, a, b, { dir: 'v', offset: -10, style: S })

  it('chữ xoay −90°, canh giữa, nằm bên trái đường (x = đường − gap)', () => {
    const t = texts(out)[0]
    expect(t.text).toBe('1500')
    expect(t.rotate).toBe(-90)
    expect(t.anchor).toBe('middle')
    expect(t.x).toBeCloseTo(90 - S.gap, 9)
    expect(t.y).toBeCloseTo(115, 9)
  })

  it('đường kích thước thẳng đứng tại x = 90, từ y = 100 đến 130', () => {
    const line = linesOf(out).find((l) => l.a.x === l.b.x && l.a.x === 90)!
    expect(Math.min(line.a.y, line.b.y)).toBeCloseTo(100, 9)
    expect(Math.max(line.a.y, line.b.y)).toBeCloseTo(130, 9)
  })

  it('đường gióng nằm ngang, vượt đường kích thước extBeyond', () => {
    const ext = hLines(out)
    expect(ext).toHaveLength(2)
    for (const l of ext) {
      expect(l.a.x).toBeCloseTo(100, 9)
      expect(l.b.x).toBeCloseTo(90 - S.extBeyond, 9)
    }
  })

  it('offset dương: đường nằm bên phải điểm ngoài cùng', () => {
    const o = dim(V, a, { x: 500, y: 1500 }, { dir: 'v', offset: 10, style: S })
    // x giấy = 100 và 110 → đường ở 120
    const line = linesOf(o).find((l) => l.a.x === l.b.x && l.a.x === 120)
    expect(line).toBeDefined()
  })

  it('y âm (mặt cắt đứng) vẫn ra khoảng cách dương', () => {
    const o = dim(
      V,
      { x: 0, y: -3900 },
      { x: 0, y: 0 },
      { dir: 'v', offset: -10, style: S },
    )
    expect(texts(o)[0].text).toBe('3900')
  })

  it('giá trị theo trục y, bỏ qua chênh x', () => {
    const o = dim(
      V,
      { x: 0, y: 0 },
      { x: 700, y: 2000 },
      { dir: 'v', offset: -10, style: S },
    )
    expect(texts(o)[0].text).toBe('2000')
  })
})

describe('dim: giá trị in lấy từ số thật', () => {
  it.each([10, 15, 20, 33, 75, 200])(
    '1:%s cùng in 1500 (không chia ngược từ kích thước trên giấy)',
    (n) => {
      const o = dim(view(n, { x: 50, y: 50 }), A, B, {
        dir: 'h',
        offset: -8,
        style: S,
      })
      expect(texts(o)[0].text).toBe('1500')
    },
  )

  it('làm tròn: 1500,4 → 1500; 1500,6 → 1501', () => {
    const lo = dim(
      V,
      A,
      { x: 1500.4, y: 0 },
      { dir: 'h', offset: -8, style: S },
    )
    const hi = dim(
      V,
      A,
      { x: 1500.6, y: 0 },
      { dir: 'h', offset: -8, style: S },
    )
    expect(texts(lo)[0].text).toBe('1500')
    expect(texts(hi)[0].text).toBe('1501')
  })

  it('label tùy chỉnh nhận khoảng cách thật', () => {
    const got: Array<number> = []
    const o = dim(V, A, B, {
      dir: 'h',
      offset: -8,
      style: S,
      label: (v) => {
        got.push(v)
        return `Chiều rộng = ${Math.round(v)}`
      },
    })
    expect(got).toEqual([1500])
    expect(texts(o)[0].text).toBe('Chiều rộng = 1500')
  })

  it('a trùng b: giá trị 0, không ra NaN', () => {
    const o = dim(V, A, A, { dir: 'h', offset: -8, style: S })
    expect(texts(o)[0].text).toBe('0')
    for (const p of o)
      for (const n of numbersOf(p)) expect(Number.isFinite(n)).toBe(true)
  })
})

describe('dim: mũi tên trong hay ngoài', () => {
  const unit = view(1, { x: 0, y: 0 }) // 1 mm thật = 1 mm giấy
  const label = () => '1500'
  const tw = measure('1500', SIZE)
  const need = tw + 2 * S.arrow
  const run = (span: number) =>
    dim(
      unit,
      { x: 0, y: 0 },
      { x: span, y: 0 },
      {
        dir: 'h',
        offset: -10,
        style: S,
        label,
      },
    )

  it('span vừa đủ chữ + 2 mũi tên (nhỉnh hơn một chút) → mũi tên trong', () => {
    const o = run(need + 1e-6)
    const [left] = arrowsOf(o).sort((p, q) => p.pts[0].x - q.pts[0].x)
    expect(left.pts[0].x).toBeCloseTo(0, 9)
    expect(left.pts[1].x).toBeGreaterThan(0) // đáy nằm trong đoạn
    const [line] = hLines(o)
    expect(Math.min(line.a.x, line.b.x)).toBeCloseTo(0, 9)
    expect(Math.max(line.a.x, line.b.x)).toBeCloseTo(need + 1e-6, 9)
  })

  it('span hụt chút xíu → mũi tên quay ra ngoài, đường kéo dài 2·arrow mỗi bên', () => {
    const span = need - 1e-6
    const o = run(span)
    const [left, right] = arrowsOf(o).sort((p, q) => p.pts[0].x - q.pts[0].x)
    // đỉnh vẫn ở hai đầu đoạn
    expect(left.pts[0].x).toBeCloseTo(0, 9)
    expect(right.pts[0].x).toBeCloseTo(span, 9)
    // đáy nằm ngoài đoạn
    expect(left.pts[1].x).toBeCloseTo(-S.arrow, 9)
    expect(right.pts[1].x).toBeCloseTo(span + S.arrow, 9)
    const [line] = hLines(o)
    expect(Math.min(line.a.x, line.b.x)).toBeCloseTo(-2 * S.arrow, 9)
    expect(Math.max(line.a.x, line.b.x)).toBeCloseTo(span + 2 * S.arrow, 9)
  })

  it('đoạn rất hẹp (100 mm thật ở 1:50): mũi tên ngoài, chữ vẫn canh giữa đoạn', () => {
    const o = dim(V, A, { x: 100, y: 0 }, { dir: 'h', offset: -10, style: S })
    const [left] = arrowsOf(o).sort((p, q) => p.pts[0].x - q.pts[0].x)
    expect(left.pts[1].x).toBeLessThan(left.pts[0].x)
    expect(texts(o)[0].x).toBeCloseTo(101, 9)
  })

  it('đoạn đứng cũng áp dụng: span hẹp → đường kéo dài hai đầu', () => {
    const o = dim(
      unit,
      { x: 0, y: 0 },
      { x: 0, y: need - 1e-6 },
      { dir: 'v', offset: -10, style: S, label },
    )
    const line = linesOf(o).find((l) => l.a.x === l.b.x && l.a.x === -10)!
    expect(Math.min(line.a.y, line.b.y)).toBeCloseTo(-2 * S.arrow, 9)
  })
})

describe("dim: head 'tick'", () => {
  const T = dimStyle(SIZE, { head: 'tick' })
  const out = dim(V, A, B, { dir: 'h', offset: -10, style: T })

  it('không có polygon; thay bằng 2 vạch nét medium', () => {
    expect(arrowsOf(out)).toHaveLength(0)
    const ticks = linesOf(out).filter((l) => l.weight === 'medium')
    expect(ticks).toHaveLength(2)
  })

  it('vạch xiên 45°, dài bằng mũi tên, tâm tại đầu đoạn', () => {
    const ticks = linesOf(out)
      .filter((l) => l.weight === 'medium')
      .sort((p, q) => p.a.x + p.b.x - (q.a.x + q.b.x))
    expect(ticks[0].a.x + ticks[0].b.x).toBeCloseTo(2 * 100, 9)
    expect(ticks[1].a.x + ticks[1].b.x).toBeCloseTo(2 * 130, 9)
    for (const t of ticks) {
      expect((t.a.y + t.b.y) / 2).toBeCloseTo(90, 9)
      const dx = t.b.x - t.a.x
      const dy = t.b.y - t.a.y
      expect(Math.abs(dx)).toBeCloseTo(Math.abs(dy), 9)
      expect(Math.hypot(dx, dy)).toBeCloseTo(T.arrow, 9)
    }
  })

  it('đường kích thước nhô qua mỗi vạch một đoạn arrow', () => {
    const line = hLines(out).find((l) => l.weight === 'thin' && l.a.y === 90)!
    expect(Math.min(line.a.x, line.b.x)).toBeCloseTo(100 - T.arrow, 9)
    expect(Math.max(line.a.x, line.b.x)).toBeCloseTo(130 + T.arrow, 9)
  })

  it('đoạn hẹp vẫn dùng vạch (không đổi bố cục): vẫn không có polygon', () => {
    const o = dim(V, A, { x: 100, y: 0 }, { dir: 'h', offset: -10, style: T })
    expect(arrowsOf(o)).toHaveLength(0)
    expect(linesOf(o).filter((l) => l.weight === 'medium')).toHaveLength(2)
  })
})

describe('dim: đường gióng ext', () => {
  const run = (ext?: 'both' | 'a' | 'b' | 'none') =>
    vLines(dim(V, A, B, { dir: 'h', offset: -10, style: S, ext })).map(
      (l) => l.a.x,
    )

  it('mặc định và "both": cả hai đầu', () => {
    expect(run().sort()).toEqual([100, 130])
    expect(run('both').sort()).toEqual([100, 130])
  })

  it('"none": không đường gióng', () => {
    expect(run('none')).toEqual([])
  })

  it('"a": chỉ ở điểm a', () => {
    expect(run('a')).toEqual([100])
  })

  it('"b": chỉ ở điểm b', () => {
    expect(run('b')).toEqual([130])
  })

  it('ext = none không bớt mũi tên, đường kích thước, chữ', () => {
    const o = dim(V, A, B, { dir: 'h', offset: -10, style: S, ext: 'none' })
    expect(arrowsOf(o)).toHaveLength(2)
    expect(hLines(o)).toHaveLength(1)
    expect(texts(o)).toHaveLength(1)
  })
})

describe('dim: textShift', () => {
  it('dời chữ dọc đường theo số mm giấy', () => {
    const base = texts(dim(V, A, B, { dir: 'h', offset: -10, style: S }))[0]
    const moved = texts(
      dim(V, A, B, { dir: 'h', offset: -10, style: S, textShift: 5 }),
    )[0]
    expect(moved.x).toBeCloseTo(base.x + 5, 9)
    expect(moved.y).toBeCloseTo(base.y, 9)
  })

  it('dim đứng: dời theo trục y', () => {
    const b = { x: 0, y: 1500 }
    const base = texts(dim(V, A, b, { dir: 'v', offset: -10, style: S }))[0]
    const moved = texts(
      dim(V, A, b, { dir: 'v', offset: -10, style: S, textShift: -4 }),
    )[0]
    expect(moved.y).toBeCloseTo(base.y - 4, 9)
    expect(moved.x).toBeCloseTo(base.x, 9)
  })

  it('chữ rộng hơn đoạn nhưng là dim đơn: không tự dời, vẫn canh giữa', () => {
    const o = dim(
      V,
      A,
      { x: 100, y: 0 },
      {
        dir: 'h',
        offset: -10,
        style: S,
        label: () => 'LỖ CHỜ = RẤT DÀI',
      },
    )
    expect(texts(o)[0].x).toBeCloseTo(101, 9)
  })
})

describe('dimChain', () => {
  // Trên giấy: 100, 106, 124, 130 (1:50) → các đoạn 300 | 900 | 300.
  const pts = [0, 300, 1200, 1500].map((x) => ({ x, y: 0 }))
  const out = dimChain(V, pts, { dir: 'h', offset: -10, style: S })

  it('mỗi điểm một đường gióng (không trùng ở điểm chung)', () => {
    const xs = vLines(out).map((l) => l.a.x)
    expect(xs).toHaveLength(4)
    expect(new Set(xs.map((x) => x.toFixed(6))).size).toBe(4)
    expect(xs.sort((p, q) => p - q)).toEqual([100, 106, 124, 130])
  })

  it('mỗi đoạn có đường kích thước, 2 mũi tên và chữ riêng', () => {
    expect(hLines(out)).toHaveLength(3)
    expect(arrowsOf(out)).toHaveLength(6)
    expect(texts(out).map((t) => t.text)).toEqual(['300', '900', '300'])
  })

  it('tất cả đường kích thước cùng một y, đường gióng vượt qua extBeyond', () => {
    for (const l of hLines(out)) expect(l.a.y).toBeCloseTo(90, 9)
    for (const l of vLines(out)) expect(l.b.y).toBeCloseTo(90 - S.extBeyond, 9)
  })

  it('chữ mỗi đoạn canh giữa đoạn đó', () => {
    const xs = texts(out).map((t) => t.x)
    expect(xs[0]).toBeCloseTo(103, 9)
    expect(xs[1]).toBeCloseTo(115, 9)
    expect(xs[2]).toBeCloseTo(127, 9)
  })

  it('labels theo từng đoạn, đoạn thiếu dùng giá trị trơn', () => {
    const o = dimChain(V, pts, {
      dir: 'h',
      offset: -10,
      style: S,
      labels: [undefined, prefixLabel('LỖ CHỜ = ')],
    })
    expect(texts(o).map((t) => t.text)).toEqual(['300', 'LỖ CHỜ = 900', '300'])
  })

  it('textShifts theo từng đoạn', () => {
    const base = texts(out)
    const o = texts(
      dimChain(V, pts, {
        dir: 'h',
        offset: -10,
        style: S,
        textShifts: [undefined, 2],
      }),
    )
    expect(o[0].x).toBeCloseTo(base[0].x, 9)
    expect(o[1].x).toBeCloseTo(base[1].x + 2, 9)
    expect(o[2].x).toBeCloseTo(base[2].x, 9)
  })

  it('ext "a": mọi điểm trừ điểm cuối; "b": mọi điểm trừ điểm đầu; "none": không có', () => {
    const run = (ext: 'a' | 'b' | 'none') =>
      vLines(dimChain(V, pts, { dir: 'h', offset: -10, style: S, ext }))
        .map((l) => l.a.x)
        .sort((p, q) => p - q)
    expect(run('a')).toEqual([100, 106, 124])
    expect(run('b')).toEqual([106, 124, 130])
    expect(run('none')).toEqual([])
  })

  it('chuỗi đứng: chữ xoay −90 hết, nằm trái đường', () => {
    const vp = [0, 300, 1200, 1500].map((y) => ({ x: 0, y }))
    const o = dimChain(V, vp, { dir: 'v', offset: -10, style: S })
    expect(texts(o).map((t) => t.text)).toEqual(['300', '900', '300'])
    for (const t of texts(o)) {
      expect(t.rotate).toBe(-90)
      expect(t.x).toBeLessThan(90)
    }
    expect(hLines(o)).toHaveLength(4)
  })

  it('tổng các đoạn = khoảng cách điểm đầu → cuối', () => {
    const sum = texts(out).reduce((s, t) => s + Number(t.text), 0)
    expect(sum).toBe(1500)
  })

  it('chuỗi 2 điểm = dim đơn', () => {
    const a = dimChain(V, [A, B], { dir: 'h', offset: -10, style: S })
    const b = dim(V, A, B, { dir: 'h', offset: -10, style: S })
    expect(a).toEqual(b)
  })
})

describe('dimChain: chữ của đoạn đầu/cuối rộng hơn đoạn', () => {
  // 0 | 100 | 3000 | 3100 ở 1:50: đoạn đầu và cuối hẹp 2 mm giấy.
  const pts = [0, 100, 3000, 3100].map((x) => ({ x, y: 0 }))
  const wide = () => 'ABCDEFGHIJ'
  const tw = measure('ABCDEFGHIJ', SIZE)
  const away = tw / 2 + 2 * S.arrow + S.gap

  it('đoạn đầu: chữ dời ra ngoài về bên trái, không đè lên đường gióng đầu', () => {
    const o = dimChain(V, pts, {
      dir: 'h',
      offset: -10,
      style: S,
      labels: [wide],
    })
    const t = texts(o)[0]
    expect(t.text).toBe('ABCDEFGHIJ')
    expect(t.x).toBeCloseTo(100 - away, 9)
    expect(textSpan(t)[1]).toBeLessThan(100)
  })

  it('đoạn cuối: chữ dời ra ngoài về bên phải', () => {
    const o = dimChain(V, pts, {
      dir: 'h',
      offset: -10,
      style: S,
      labels: [undefined, undefined, wide],
    })
    const t = texts(o)[2]
    expect(t.x).toBeCloseTo(100 + 3100 / 50 + away, 9)
    expect(textSpan(t)[0]).toBeGreaterThan(100 + 3100 / 50)
  })

  it('đoạn giữa hẹp: chữ ở yên giữa đoạn', () => {
    const mid = [0, 3000, 3100, 6100].map((x) => ({ x, y: 0 }))
    const o = dimChain(V, mid, {
      dir: 'h',
      offset: -10,
      style: S,
      labels: [undefined, wide],
    })
    expect(texts(o)[1].x).toBeCloseTo(100 + 3050 / 50, 9)
  })

  it('đoạn đầu có textShift thì dùng textShift, không dời ra ngoài', () => {
    const o = dimChain(V, pts, {
      dir: 'h',
      offset: -10,
      style: S,
      labels: [wide],
      textShifts: [3],
    })
    expect(texts(o)[0].x).toBeCloseTo(101 + 3, 9)
  })

  it('chuỗi đứng: dời ra ngoài theo trục y (lên trên với đoạn đầu)', () => {
    const vp = pts.map((p) => ({ x: 0, y: p.x }))
    const o = dimChain(V, vp, {
      dir: 'v',
      offset: -10,
      style: S,
      labels: [wide],
    })
    expect(texts(o)[0].y).toBeCloseTo(100 - away, 9)
  })
})

describe('dimChain: chuỗi đi ngược chiều trên giấy (đầu tự do theo điểm đầu/cuối thật)', () => {
  const wide = () => 'ABCDEFGHIJ'
  const tw = measure('ABCDEFGHIJ', SIZE)
  const away = tw / 2 + 2 * S.arrow + S.gap

  it('chuỗi đứng y = −cao độ đi từ dưới lên: đoạn đầu dời xuống phía điểm đầu, đoạn cuối dời lên phía điểm cuối', () => {
    // cao độ 0, 100, 3000, 3100 → y = 0, −100, −3000, −3100; giấy y: 100, 98, 40, 38
    const pts = [0, 100, 3000, 3100].map((e) => ({ x: 0, y: -e }))
    const o = dimChain(V, pts, {
      dir: 'v',
      offset: -10,
      style: S,
      labels: [wide, undefined, wide],
    })
    const [first, mid, last] = texts(o)
    // đoạn đầu: chữ nằm ngoài chuỗi, phía dưới điểm đầu (y giấy 100)
    expect(first.y).toBeCloseTo(100 + away, 9)
    expect(first.y - tw / 2).toBeGreaterThan(100)
    // đoạn cuối: chữ nằm ngoài chuỗi, phía trên điểm cuối (y giấy 38)
    expect(last.y).toBeCloseTo(38 - away, 9)
    expect(last.y + tw / 2).toBeLessThan(38)
    // đoạn giữa: ở yên giữa đoạn
    expect(mid.y).toBeCloseTo((98 + 40) / 2, 9)
    // không đè lên đoạn kế
    expect(first.y - tw / 2).toBeGreaterThan(98)
    expect(last.y + tw / 2).toBeLessThan(40)
  })

  it('chuỗi ngang truyền từ phải sang trái: đầu tự do vẫn là điểm đầu/cuối thật', () => {
    // x thật 3100, 3000, 100, 0 → giấy 162, 160, 102, 100
    const pts = [3100, 3000, 100, 0].map((x) => ({ x, y: 0 }))
    const o = dimChain(V, pts, {
      dir: 'h',
      offset: -10,
      style: S,
      labels: [wide, undefined, wide],
    })
    const [first, mid, last] = texts(o)
    // đoạn đầu (ở bên phải): chữ dời sang phải, ra ngoài chuỗi
    expect(first.x).toBeCloseTo(162 + away, 9)
    expect(textSpan(first)[0]).toBeGreaterThan(162)
    // đoạn cuối (ở bên trái): chữ dời sang trái
    expect(last.x).toBeCloseTo(100 - away, 9)
    expect(textSpan(last)[1]).toBeLessThan(100)
    expect(mid.x).toBeCloseTo(131, 9)
  })

  it('chuỗi xuôi chiều vẫn như cũ (đoạn đầu sang trái, đoạn cuối sang phải)', () => {
    const pts = [0, 100, 3000, 3100].map((x) => ({ x, y: 0 }))
    const o = dimChain(V, pts, {
      dir: 'h',
      offset: -10,
      style: S,
      labels: [wide, undefined, wide],
    })
    expect(texts(o)[0].x).toBeCloseTo(100 - away, 9)
    expect(texts(o)[2].x).toBeCloseTo(162 + away, 9)
  })

  it.each([
    ['ngang xuôi', 'h', A, { x: 100, y: 0 }],
    ['ngang ngược', 'h', { x: 100, y: 0 }, A],
    ['đứng xuôi', 'v', A, { x: 0, y: 100 }],
    ['đứng ngược', 'v', { x: 0, y: -100 }, A],
  ] as const)(
    'chuỗi 2 điểm (dim đơn) %s: chữ rộng không dời',
    (_t, dir, a, b) => {
      const o = dim(V, a, b, { dir, offset: -10, style: S, label: wide })
      const t = texts(o)[0]
      const c = dir === 'h' ? t.x : t.y
      const lo = dir === 'h' ? Math.min(a.x, b.x) : Math.min(a.y, b.y)
      expect(c).toBeCloseTo(100 + (lo + 50) / 50, 9)
    },
  )
})

describe('dim / dimChain: dữ liệu không hợp lệ', () => {
  it.each([
    ['a.x NaN', { x: NaN, y: 0 }, B],
    ['a.y Infinity', { x: 0, y: Infinity }, B],
    ['b.x NaN', A, { x: NaN, y: 0 }],
    ['b.y -Infinity', A, { x: 0, y: -Infinity }],
  ])('dim: %s → []', (_t, a, b) => {
    expect(dim(V, a, b, { dir: 'h', offset: -10, style: S })).toEqual([])
    expect(dim(V, a, b, { dir: 'v', offset: -10, style: S })).toEqual([])
  })

  it('dimChain: một điểm không hữu hạn → bỏ cả chuỗi', () => {
    const pts = [A, { x: NaN, y: 0 }, B]
    expect(dimChain(V, pts, { dir: 'h', offset: -10, style: S })).toEqual([])
  })

  it('dimChain: dưới 2 điểm → []', () => {
    expect(dimChain(V, [], { dir: 'h', offset: -10, style: S })).toEqual([])
    expect(dimChain(V, [A], { dir: 'h', offset: -10, style: S })).toEqual([])
  })
})

describe('dim / dimChain: ổn định', () => {
  const cases: Array<[string, Array<Prim>]> = []
  for (const dir of ['h', 'v'] as const)
    for (const offset of [-12, 12])
      for (const head of ['arrow', 'tick'] as const)
        for (const ext of ['both', 'a', 'b', 'none'] as const) {
          const style = dimStyle(3.5, { head })
          const along = (n: number) =>
            dir === 'h' ? { x: n, y: 0 } : { x: 0, y: n }
          cases.push([
            `${dir} ${offset} ${head} ${ext}`,
            dimChain(V, [along(0), along(120), along(2400), along(2500)], {
              dir,
              offset,
              style,
              ext,
            }),
          ])
        }

  it.each(cases)('mọi tọa độ hữu hạn (%s)', (_name, prims) => {
    expect(prims.length).toBeGreaterThan(0)
    for (const p of prims)
      for (const n of numbersOf(p)) expect(Number.isFinite(n)).toBe(true)
  })

  it('gọi 2 lần ra kết quả giống hệt', () => {
    const f = () =>
      dimChain(V, [A, { x: 700, y: 0 }, B], {
        dir: 'h',
        offset: -9,
        style: S,
        labels: [prefixLabel('R = ')],
      })
    expect(f()).toEqual(f())
  })
})
