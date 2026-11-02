import { beforeEach, describe, expect, it, vi } from 'vitest'

import { JAMB } from '#/domain/config'
import { derive } from '#/domain/derive'
import { presetParams } from '#/domain/presets'
import type { ElevatorParams, JambType } from '#/domain/schema'
import { SHEET_AREA } from '#/drawing/frame/layout'
import type * as Primitives from '#/drawing/primitives'
import { primsBounds } from '#/drawing/sheets/figure'
import {
  JAMB_LABEL,
  LANDING_NOTE,
  LANDING_TITLE,
  landingSheet,
  landingSubtitle,
} from '#/drawing/sheets/landing-door'
import { stretchedBox, symbol } from '#/drawing/symbols'
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

// Ghi lại các lần đặt ký hiệu / tô vật liệu (vẫn chạy hàm thật) để nhận ra phần tử nào
// được vẽ mà không phải dò theo hình học.
const spy = vi.hoisted(() => ({
  symbols: [] as Array<{ id: string; opts: PlaceOpts; out: Array<unknown> }>,
  hatches: [] as Array<string>,
}))

vi.mock('#/drawing/symbols', async (orig) => {
  const m = await orig<typeof Symbols>()
  return {
    ...m,
    placeSymbol: (s: { id: string }, opts: PlaceOpts) => {
      const out = m.placeSymbol(s as never, opts)
      spy.symbols.push({ id: s.id, opts, out })
      return out
    },
  }
})

vi.mock('#/drawing/primitives', async (orig) => {
  const m = await orig<typeof Primitives>()
  return {
    ...m,
    hatch: (...a: Parameters<typeof m.hatch>) => {
      spy.hatches.push(a[2])
      return m.hatch(...a)
    },
  }
})

beforeEach(() => {
  spy.symbols.length = 0
  spy.hatches.length = 0
})

type Id = 'house-5f' | 'hotel-9f'
const clone = (id: Id = 'house-5f') =>
  structuredClone<ElevatorParams>(presetParams(id))
const draw = (p: ElevatorParams, jamb: JambType) =>
  landingSheet(p, derive(p), jamb)
const words = (p: ElevatorParams, jamb: JambType) =>
  texts(draw(p, jamb)).map((t) => t.text)
const finite = (out: Array<Prim>) => {
  for (const q of out)
    for (const n of numbersOf(q)) expect(Number.isFinite(n)).toBe(true)
}
/**
 * Ký hiệu `id` đã đặt ở lần vẽ cuối. `fitFigure` vẽ thử rồi vẽ thật (cùng số lần mỗi
 * ký hiệu), mà `door-front` luôn có đúng 1 lần mỗi lượt: đó là số lượt.
 */
const placed = (id: string) => {
  const passes = spy.symbols.filter((s) => s.id === 'door-front').length
  const all = spy.symbols.filter((s) => s.id === id)
  return passes ? all.slice(all.length - all.length / passes) : all
}

/** Số liệu mong đợi của từng bộ mẫu × loại bao che. */
const EXPECT = {
  'house-5f': {
    ah: 1500,
    op: 700,
    wide: { hole: 1100, side: 200 },
    narrow: { hole: 900, side: 300 },
  },
  'hotel-9f': {
    ah: 1800,
    op: 800,
    wide: { hole: 1100, side: 350 },
    narrow: { hole: 1000, side: 400 },
  },
} as const

describe.each(['house-5f', 'hotel-9f'] as const)('landingSheet: %s', (id) => {
  describe.each(['wide', 'narrow'] as const)('%s', (jamb) => {
    const e = EXPECT[id]
    const p = clone(id)
    const out = draw(p, jamb)
    const ts = texts(out)
    const ws = ts.map((t) => t.text)

    it('mọi số hữu hạn; vẽ 2 lần giống hệt', () => {
      expect(out.length).toBeGreaterThan(50)
      finite(out)
      expect(draw(clone(id), jamb)).toEqual(out)
    })

    it('mọi điểm và hộp bao nằm trong SHEET_AREA', () => {
      expectInside(out, SHEET_AREA)
      const b = primsBounds(out)!
      expect(b.x).toBeGreaterThanOrEqual(SHEET_AREA.left - EPS)
      expect(b.x + b.w).toBeLessThanOrEqual(SHEET_AREA.right + EPS)
      expect(b.y).toBeGreaterThanOrEqual(SHEET_AREA.top - EPS)
      expect(b.y + b.h).toBeLessThanOrEqual(SHEET_AREA.bottom + EPS)
    })

    it('hai đoạn tường hai bên và LỖ CHỜ đúng số', () => {
      const side = String(e[jamb].side)
      expect(ws.filter((w) => w === side).length).toBeGreaterThanOrEqual(4)
      expect(ws).toContain(`LỖ CHỜ = ${e[jamb].hole}`)
      expect(ws).toContain(String(e[jamb].hole))
    })

    it('kích thước lỗ chờ thô, lanh tô, hộp gọi', () => {
      expect(ws).toContain('2300') // chiều cao lỗ chờ thô
      expect(ws).toContain('200') // lanh tô
      expect(ws).toContain('1100') // đáy hộp gọi
      expect(ws).toContain('400') // chiều cao hộp gọi
      expect(ws).toContain('100') // bề rộng lỗ hộp
    })

    it('HH, OP và Hoistway Width AH', () => {
      expect(ws).toContain('HH 2100')
      expect(ws).toContain(`OP=${e.op}`)
      expect(ws).toContain(`Hoistway Width AH ${e.ah}`)
    })

    it('tiêu đề, dòng tầng và nhãn loại bao che', () => {
      expect(ws).toContain(LANDING_TITLE)
      expect(ws).toContain(
        jamb === 'wide'
          ? 'Tầng 1F : bao che rộng'
          : id === 'house-5f'
            ? 'Tầng 2F ~ 5F : bao che hẹp'
            : 'Tầng 2F ~ 9F : bao che hẹp',
      )
      expect(ws).toContain(JAMB_LABEL[jamb])
      // Nhãn loại kia không xuất hiện.
      expect(ws).not.toContain(JAMB_LABEL[jamb === 'wide' ? 'narrow' : 'wide'])
    })

    it('ghi chú "Phần chừa trống…" cả ở hình đứng (xoay -90) và mặt bằng', () => {
      for (const line of LANDING_NOTE) {
        const found = ts.filter((t) => t.text === line)
        expect(found.filter((t) => t.rotate === -90)).toHaveLength(1)
        expect(found.filter((t) => !t.rotate)).toHaveLength(1)
      }
    })

    it('mọi chữ kích thước cùng một cỡ', () => {
      const dimText = ts.filter(
        (t) =>
          /^\d+$/.test(t.text) ||
          /^(LỖ CHỜ = |HH |OP=|Hoistway Width AH )/.test(t.text),
      )
      expect(dimText.length).toBeGreaterThan(15)
      const sizes = new Set(dimText.map((t) => t.size.toFixed(6)))
      expect([...sizes]).toHaveLength(1)
      // Ghi chú cùng cỡ với kích thước (PO 02/11/2026); nhãn loại bao che và tiêu đề lớn hơn.
      const note = ts.find((t) => t.text === LANDING_NOTE[0] && !t.rotate)!
      expect(note.size).toBeCloseTo(dimText[0].size, 9)
      const title = ts.find((t) => t.text === LANDING_TITLE)!
      expect(title.size).toBeGreaterThan(dimText[0].size)
    })

    it('chữ không vượt khỏi vùng vẽ (đo bằng độ rộng thật)', () => {
      for (const t of ts) {
        const [x0, x1] = textSpan(t)
        if (t.rotate) continue
        expect(x0, t.text).toBeGreaterThanOrEqual(SHEET_AREA.left - EPS)
        expect(x1, t.text).toBeLessThanOrEqual(SHEET_AREA.right + EPS)
      }
    })
  })
})

describe('landingSheet: phần chỉ có ở bao che rộng', () => {
  it.each(['house-5f', 'hotel-9f'] as const)(
    '%s: hộp hiển thị tầng (ANSI34 + floor-indicator) và 2 tấm khung xiên chỉ ở bao che rộng',
    (id) => {
      const p = clone(id)
      draw(p, 'wide')
      expect(placed('floor-indicator')).toHaveLength(1)
      expect(placed('jamb-wide-plan')).toHaveLength(2)
      expect(spy.hatches).toContain('ANSI34')
      // Hai tấm đối xứng nhau: một tấm lật gương.
      expect(placed('jamb-wide-plan').map((s) => !!s.opts.mirrorX)).toEqual([
        false,
        true,
      ])
      expect(placed('jamb-wide-jd320')).toHaveLength(1)
      expect(placed('jamb-narrow-35x50')).toHaveLength(0)

      spy.symbols.length = 0
      spy.hatches.length = 0
      draw(p, 'narrow')
      expect(placed('floor-indicator')).toHaveLength(0)
      expect(placed('jamb-wide-plan')).toHaveLength(0)
      expect(spy.hatches).not.toContain('ANSI34')
      expect(placed('jamb-narrow-35x50')).toHaveLength(1)
      expect(placed('jamb-wide-jd320')).toHaveLength(0)
    },
  )

  it.each(['wide', 'narrow'] as const)(
    '%s: 2 mũi tên mở cửa đối xứng, hộp gọi hình đứng và 2 lỗ hộp trên mặt bằng',
    (jamb) => {
      draw(clone(), jamb)
      const arrows = placed('door-open-arrow')
      expect(arrows).toHaveLength(2)
      expect(arrows.map((a) => !!a.opts.mirrorX)).toEqual([false, true])
      // Đối xứng qua tim cửa (mũi tên trái lật gương = mũi tên phải).
      const [l, r] = [arrows[0].opts.at.x, arrows[1].opts.at.x]
      expect(l).toBeLessThan(r)
      const door = placed('door-front')[0].opts.at.x
      expect((r + l) / 2).toBeCloseTo(door, 6)
      expect(placed('call-box')).toHaveLength(1)
      // Ô ⊠ ở hình mặt bằng của cả hai hình.
      expect(placed('call-box-plan')).toHaveLength(2)
    },
  )
})

describe('landingSheet: dòng tầng theo danh sách tầng', () => {
  it('tầng không liền nhau: "Tầng 2F ~ 3F, 5F"; tầng không có cửa bị bỏ', () => {
    const p = clone('house-5f')
    p.floors[3].hasDoor = false // 4F
    const d = derive(p)
    expect(landingSubtitle(d, 'narrow')).toBe('Tầng 2F ~ 3F, 5F : bao che hẹp')
    expect(landingSubtitle(d, 'wide')).toBe('Tầng 1F : bao che rộng')
    expect(words(p, 'narrow')).toContain('Tầng 2F ~ 3F, 5F : bao che hẹp')
    expect(words(p, 'narrow').join('|')).not.toContain('4F')
  })

  it('tầng giữa dùng bao che rộng cũng tách khỏi dãy hẹp', () => {
    const p = clone('house-5f')
    p.floors[2].jamb = 'wide' // 3F
    const d = derive(p)
    expect(landingSubtitle(d, 'wide')).toBe('Tầng 1F, 3F : bao che rộng')
    expect(landingSubtitle(d, 'narrow')).toBe('Tầng 2F, 4F ~ 5F : bao che hẹp')
  })

  it('landingSubtitle: bộ mẫu', () => {
    const d = derive(presetParams('house-5f'))
    expect(landingSubtitle(d, 'wide')).toBe('Tầng 1F : bao che rộng')
    expect(landingSubtitle(d, 'narrow')).toBe('Tầng 2F ~ 5F : bao che hẹp')
  })
})

describe('landingSheet: theo tham số', () => {
  it('đổi HH 2100 → 2200 thì có "HH 2200"', () => {
    const p = clone('house-5f')
    p.tech.door.height = 2200
    for (const j of ['wide', 'narrow'] as const) {
      expect(words(p, j)).toContain('HH 2200')
      expect(words(p, j)).not.toContain('HH 2100')
    }
  })

  it('đổi OP 700 → 900 (bao che hẹp): lỗ chờ 1100, hai bên 200, "OP=900"', () => {
    const p = clone('house-5f')
    p.tech.door.width = 900
    const ws = words(p, 'narrow')
    expect(ws).toContain('OP=900')
    expect(ws).not.toContain('OP=700')
    expect(ws).toContain('LỖ CHỜ = 1100')
  })

  it('đổi OP: tim hai lá cửa và chữ OP trùng tim lỗ chờ', () => {
    for (const op of [700, 900]) {
      const p = clone('house-5f')
      p.tech.door.width = op
      const out = draw(p, 'narrow')
      const ts = texts(out)
      const ah = ts.filter((t) => t.text.startsWith('Hoistway Width AH'))
      const opT = ts.filter((t) => t.text === `OP=${op}`)
      expect(ah).toHaveLength(3)
      expect(opT).toHaveLength(2)
      const mid = (t: (typeof ts)[number]) => {
        const [a, b] = textSpan(t)
        return (a + b) / 2
      }
      // ah[0] là mặt bằng chừa thô; ah[1], ah[2] cùng cột với OP hình đứng / mặt bằng.
      expect(mid(opT[0])).toBeCloseTo(mid(ah[1]), 6)
      expect(mid(opT[1])).toBeCloseTo(mid(ah[2]), 6)
      // Hai mũi tên mở cửa đối xứng quanh cánh cửa.
      const arrows = placed('door-open-arrow')
      expect(arrows).toHaveLength(2)
      const door = placed('door-front')[0].opts.at.x
      expect(door).toBeCloseTo(mid(ah[1]), 6)
      const [a, b] = [arrows[0].opts.at.x, arrows[1].opts.at.x]
      expect(a).toBeLessThan(b)
      expect(door - a).toBeCloseTo(b - door, 6)
      // Khung bao che (jamb) đối xứng quanh tim: tim hộp bao = tim cửa.
      const jb = placed('jamb-narrow-35x50')[0].out as Array<Prim>
      const bb = primsBounds(jb)!
      expect(bb.x + bb.w / 2).toBeCloseTo(door, 3)
      spy.symbols.length = 0
    }
  })
})

describe('landingSheet: thông số lạ', () => {
  const ok = (p: ElevatorParams, jamb: JambType) => {
    let out: Array<Prim> = []
    expect(() => (out = draw(p, jamb))).not.toThrow()
    expect(out.length).toBeGreaterThan(0)
    finite(out)
    expectInside(out, SHEET_AREA)
    return out
  }

  it.each(['wide', 'narrow'] as const)('AH 2200, %s', (jamb) => {
    const p = clone('house-5f')
    p.tech.shaft.width = 2200
    const ws = texts(ok(p, jamb)).map((t) => t.text)
    expect(ws).toContain('Hoistway Width AH 2200')
  })

  it('OP 850 bao che rộng (khung rộng hơn lỗ chờ)', () => {
    const p = clone('house-5f')
    p.tech.door.width = 850
    const ws = texts(ok(p, 'wide')).map((t) => t.text)
    expect(ws).toContain('OP=850')
    expect(ws).toContain('LỖ CHỜ = 1100')
  })

  it('HH sát lỗ chờ thô (2299): khung vượt chiều cao vẫn vẽ được', () => {
    const p = clone('house-5f')
    p.tech.door.height = 2299
    ok(p, 'wide')
    ok(p, 'narrow')
  })

  it('hộp gọi 150×500 @ 1200: có chữ 150, 500, 1200 và ô ⊠ rộng 150·k ở cả 2 mặt bằng', () => {
    const p = clone('house-5f')
    p.structure.callBox = { w: 150, h: 500, bottom: 1200 }
    for (const j of ['wide', 'narrow'] as const) {
      spy.symbols.length = 0
      const ws = texts(ok(p, j)).map((t) => t.text)
      expect(ws).toContain('150')
      expect(ws).toContain('500')
      expect(ws).toContain('1200')
      const plans = placed('call-box-plan')
      expect(plans).toHaveLength(2)
      for (const s of plans) {
        const b = primsBounds(s.out as Array<Prim>)!
        expect(b.w).toBeCloseTo(150 * s.opts.scale, 6)
        expect(b.h).toBeCloseTo(90 * s.opts.scale, 6)
      }
    }
  })

  it('ô ⊠ rộng bằng lỗ hộp (100·k) với hộp mặc định; hộp rộng hơn tường thì rộng bằng tường', () => {
    const p = clone('house-5f')
    for (const j of ['wide', 'narrow'] as const) {
      spy.symbols.length = 0
      draw(p, j)
      for (const s of placed('call-box-plan'))
        expect(primsBounds(s.out as Array<Prim>)!.w).toBeCloseTo(
          100 * s.opts.scale,
          6,
        )
    }
    p.structure.callBox = { w: 600, h: 400, bottom: 1100 }
    const side = { wide: 200, narrow: 300 }
    for (const j of ['wide', 'narrow'] as const) {
      spy.symbols.length = 0
      draw(p, j)
      const plans = placed('call-box-plan')
      expect(plans).toHaveLength(2)
      for (const s of plans)
        expect(primsBounds(s.out as Array<Prim>)!.w).toBeCloseTo(
          side[j] * s.opts.scale,
          6,
        )
    }
  })

  it('hộp gọi rộng hơn đoạn tường hai bên: bị cắt theo tường, không ném lỗi', () => {
    const p = clone('house-5f')
    p.structure.callBox = { w: 600, h: 400, bottom: 1100 }
    ok(p, 'wide')
    ok(p, 'narrow')
  })

  it('hộp gọi bottom 2400 ≥ lỗ chờ thô 2300: không có ô ⊠ lẫn hộp gọi', () => {
    const p = clone('house-5f')
    p.structure.callBox = { w: 100, h: 400, bottom: 2400 }
    for (const j of ['wide', 'narrow'] as const) {
      spy.symbols.length = 0
      ok(p, j)
      expect(placed('call-box-plan')).toHaveLength(0)
      expect(placed('call-box')).toHaveLength(0)
    }
  })

  it('hộp gọi bottom + h > lỗ chờ thô', () => {
    const p = clone('house-5f')
    p.structure.callBox = { w: 100, h: 800, bottom: 1800 } // 2600 > 2300
    ok(p, 'wide')
    ok(p, 'narrow')
    p.structure.callBox = { w: 100, h: 400, bottom: 5000 } // đáy ngoài lỗ chờ
    ok(p, 'narrow')
  })

  it('hộp gọi có kích thước 0 hoặc NaN không ném lỗi', () => {
    const p = clone('house-5f')
    p.structure.callBox = { w: 0, h: 0, bottom: 0 }
    ok(p, 'narrow')
    p.structure.callBox = { w: NaN, h: NaN, bottom: NaN }
    expect(() => draw(p, 'narrow')).not.toThrow()
  })

  it('side = 0 (lỗ chờ = AH): không có hộp gọi, vẫn trong vùng vẽ', () => {
    const p = clone('house-5f')
    p.tech.shaft.width = 1100
    const wide = ok(p, 'wide')
    expect(placed('call-box')).toHaveLength(0)
    expect(placed('call-box-plan')).toHaveLength(0)
    expect(texts(wide).map((t) => t.text)).toContain('LỖ CHỜ = 1100')
    spy.symbols.length = 0
    p.tech.shaft.width = p.tech.door.width + 200 // hẹp: lỗ chờ = AH
    ok(p, 'narrow')
    expect(placed('call-box-plan')).toHaveLength(0)
  })

  it('lỗ chờ vượt AH (side âm) không ném lỗi', () => {
    const p = clone('house-5f')
    p.tech.shaft.width = 1000
    ok(p, 'wide')
  })

  it('tên 300 ký tự không làm chữ vượt khỏi vùng vẽ', () => {
    const p = clone('house-5f')
    p.project.name = 'A'.repeat(300)
    p.project.address = 'B'.repeat(300)
    ok(p, 'wide')
  })
})

describe('landingSheet: khung bao che khớp ký hiệu DWG', () => {
  it.each([
    [700, 2100],
    [800, 2100],
    [900, 2200],
  ])('OP %s / HH %s: stretchedBox = OP + extra × HH + head', (op, hh) => {
    for (const [jamb, id] of [
      ['wide', 'jamb-wide-jd320'],
      ['narrow', 'jamb-narrow-35x50'],
    ] as const) {
      const b = stretchedBox(symbol(id), { x: op - 700, y: hh - 2100 })
      expect(b.w).toBeCloseTo(op + JAMB.frame[jamb].extra, 6)
      expect(b.h).toBeCloseTo(hh + JAMB.frame[jamb].head, 6)
    }
  })
})

describe('landingSheet: bao che rộng đối xứng quanh tim cửa', () => {
  it.each([700, 800])('OP %s: khung và 2 tấm jamb-wide-plan', (op) => {
    const p = clone('house-5f')
    p.tech.door.width = op
    draw(p, 'wide')
    const door = placed('door-front')[0].opts.at.x
    const frame = primsBounds(placed('jamb-wide-jd320')[0].out as Array<Prim>)!
    expect(frame.x + frame.w / 2).toBeCloseTo(door, 3)
    const plates = placed('jamb-wide-plan').map((s) =>
      primsBounds(s.out as Array<Prim>)!,
    )
    expect(plates).toHaveLength(2)
    const mids = plates.map((b) => b.x + b.w / 2)
    expect(mids[0]).toBeLessThan(door)
    expect(mids[1]).toBeGreaterThan(door)
    expect((mids[0] + mids[1]) / 2).toBeCloseTo(door, 3)
    // Cùng kích thước: đối xứng thật.
    expect(plates[0].w).toBeCloseTo(plates[1].w, 6)
    expect(plates[0].h).toBeCloseTo(plates[1].h, 6)
  })
})

describe('landingSheet: chuỗi HH của bao che rộng', () => {
  it('mốc thứ 3 ở x = tim − (OP + 290)/2, không kẹp theo lỗ chờ (OP 850: khung vượt 1100)', () => {
    const p = clone('house-5f')
    p.tech.door.width = 850 // khung 1140 > lỗ chờ 1100; tim 750 → mép khung 180 < 200
    const out = draw(p, 'wide')
    const door = placed('door-front')[0].opts.at.x
    const k = placed('door-front')[0].opts.scale
    const frameLeft = door - ((850 + JAMB.frame.wide.extra) / 2) * k
    const clamped = door - (750 - 200) * k
    // Đường gióng ngang của mốc thứ 3 chạy từ mép khung sang trái ra đường kích thước
    // (dài hơn nhiều so với 1 mm giấy); khung bao che chỉ có nét đi sang phải.
    const ext = (x: number) =>
      out.filter(
        (q) =>
          q.kind === 'line' &&
          Math.abs(q.a.y - q.b.y) < 1e-9 &&
          Math.max(q.a.x, q.b.x) >= x - 1e-6 &&
          Math.max(q.a.x, q.b.x) <= x + 1.5 &&
          Math.min(q.a.x, q.b.x) < x - 3,
      )
    expect(ext(frameLeft).length).toBeGreaterThan(0)
    expect(frameLeft).toBeLessThan(clamped)
  })
})

describe('JAMB_LABEL', () => {
  it('nhãn cố định của DWG', () => {
    expect(JAMB_LABEL).toEqual({
      wide: 'Wide jamb GF (JD320)',
      narrow: 'Narrow jamb nF (35x50)',
    })
  })
})
