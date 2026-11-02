import { describe, expect, it } from 'vitest'

import {
  HATCH_NAMES,
  HATCH_PATTERNS,
} from '#/drawing/primitives/hatch-patterns'

describe('HATCH_PATTERNS', () => {
  it('đủ 7 mẫu dùng trên bản vẽ mẫu', () => {
    expect([...HATCH_NAMES].sort()).toEqual(
      [
        'AR-B816C',
        'AR-BRSTD',
        'AR-CONC',
        'ANSI31',
        'ANSI32',
        'ANSI34',
        'BRSTONE',
      ].sort(),
    )
  })

  it('HATCH_NAMES khớp khóa của HATCH_PATTERNS', () => {
    expect(HATCH_NAMES).toEqual(Object.keys(HATCH_PATTERNS))
  })

  it.each(HATCH_NAMES)(
    '%s: nhãn tiếng Việt, nét hợp lệ, có ít nhất 1 họ đường',
    (name) => {
      const p = HATCH_PATTERNS[name]
      expect(p.label.trim()).not.toBe('')
      expect(['thin', 'medium', 'thick']).toContain(p.weight)
      expect(p.lines.length).toBeGreaterThan(0)
    },
  )

  it.each(HATCH_NAMES)(
    '%s: mọi số hữu hạn, có bước ngang đường khác 0',
    (name) => {
      for (const l of HATCH_PATTERNS[name].lines) {
        for (const n of [l.angle, ...l.origin, ...l.delta, ...l.dashes])
          expect(Number.isFinite(n)).toBe(true)
        // delta[1] = 0 sẽ làm cả họ đường bị bỏ qua.
        expect(Math.abs(l.delta[1])).toBeGreaterThan(0)
      }
    },
  )

  it.each(HATCH_NAMES)('%s: nét đứt có tổng chu kỳ > 0 (hoặc liền)', (name) => {
    for (const l of HATCH_PATTERNS[name].lines) {
      if (!l.dashes.length) continue
      const period = l.dashes.reduce<number>((s, d) => s + Math.abs(d), 0)
      expect(period).toBeGreaterThan(0)
    }
  })

  it('AR-CONC là mẫu duy nhất mặc định nét medium (bê tông in đậm hơn)', () => {
    expect(HATCH_PATTERNS['AR-CONC'].weight).toBe('medium')
    for (const name of HATCH_NAMES.filter((n) => n !== 'AR-CONC'))
      expect(HATCH_PATTERNS[name].weight).toBe('thin')
  })

  it('AR-BRSTD theo AutoCAD: ngang cách 2,667; dọc nét 2,667 / hở 2,667, bước 4', () => {
    const [h, v] = HATCH_PATTERNS['AR-BRSTD'].lines
    expect(h.angle).toBe(0)
    expect(h.delta).toEqual([0, 2.667])
    expect(h.dashes).toEqual([])
    expect(v.angle).toBe(90)
    expect(v.delta).toEqual([2.667, 4])
    expect(v.dashes).toEqual([2.667, -2.667])
  })

  it('ANSI31: một họ đường 45°, cách 0,125; ANSI32: hai họ lệch nhau', () => {
    expect(HATCH_PATTERNS.ANSI31.lines).toHaveLength(1)
    expect(HATCH_PATTERNS.ANSI31.lines[0].angle).toBe(45)
    expect(HATCH_PATTERNS.ANSI31.lines[0].delta).toEqual([0, 0.125])
    expect(HATCH_PATTERNS.ANSI32.lines).toHaveLength(2)
    expect(HATCH_PATTERNS.ANSI34.lines).toHaveLength(4)
  })
})
