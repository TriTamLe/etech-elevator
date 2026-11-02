import { describe, expect, it } from 'vitest'

import { derive } from '#/domain/derive'
import { presetParams } from '#/domain/presets'
import type { ElevatorParams } from '#/domain/schema'
import { SHEET_AREA } from '#/drawing/frame/layout'
import { primsBounds } from '#/drawing/sheets/figure'
import {
  BEAM_LABEL,
  HOOK_LABEL,
  MACHINE_ROOM_TITLE,
  machineRoomSheet,
} from '#/drawing/sheets/machine-room'
import {
  EPS,
  expectInside,
  numbersOf,
  sideWalls,
  textSpan,
  texts,
} from '#/tests/drawing/helpers'

const clone = (id: 'house-5f' | 'hotel-9f') =>
  structuredClone<ElevatorParams>(presetParams(id))
const draw = (p: ElevatorParams) => machineRoomSheet(p, derive(p))
const words = (p: ElevatorParams) => texts(draw(p)).map((t) => t.text)

describe.each(['house-5f', 'hotel-9f'] as const)(
  'machineRoomSheet: %s',
  (id) => {
    const p = clone(id)
    const out = draw(p)
    const ws = texts(out).map((t) => t.text)

    it('mọi số hữu hạn; vẽ 2 lần giống hệt', () => {
      for (const q of out)
        for (const n of numbersOf(q)) expect(Number.isFinite(n)).toBe(true)
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

    it('có tiêu đề, "Hướng cửa vào thang máy" và nhãn móc treo', () => {
      expect(ws).toContain(MACHINE_ROOM_TITLE)
      expect(ws).toContain('Hướng cửa vào thang máy')
      expect(ws).toContain(HOOK_LABEL)
    })

    it('nhãn CPM "CPM 800 x 1200"', () => {
      expect(ws).toContain('CPM 800 x 1200')
    })

    it('có kích thước Chiều rộng và Chiều sâu', () => {
      const ah = p.tech.shaft.width
      const bh = p.tech.shaft.depth
      expect(ws).toContain(`Chiều rộng = ${ah}`)
      expect(ws).toContain(`Chiều sâu = ${bh}`)
    })
  },
)

describe('machineRoomSheet: dầm đặt máy', () => {
  it('house-5f (beams): 3 nhãn, 2 nhãn xoay -90', () => {
    const p = clone('house-5f')
    expect(p.topRoom.machineSupport).toBe('beams')
    const beams = texts(draw(p)).filter((t) => t.text === BEAM_LABEL)
    expect(beams).toHaveLength(3)
    expect(beams.filter((t) => t.rotate === -90)).toHaveLength(2)
    expect(beams.filter((t) => !t.rotate)).toHaveLength(1)
  })

  it('hotel-9f (floor): không có "Dầm đặt máy"', () => {
    const p = clone('hotel-9f')
    expect(p.topRoom.machineSupport).toBe('floor')
    expect(words(p)).not.toContain(BEAM_LABEL)
  })

  it.each(['house-5f', 'hotel-9f'] as const)(
    '%s: đổi kiểu đỡ máy thì nhãn có / mất',
    (id) => {
      const beams = clone(id)
      beams.topRoom.machineSupport = 'beams'
      const floor = clone(id)
      floor.topRoom.machineSupport = 'floor'
      expect(words(beams)).toContain(BEAM_LABEL)
      expect(words(floor)).not.toContain(BEAM_LABEL)
      expectInside(draw(beams), SHEET_AREA)
      expectInside(draw(floor), SHEET_AREA)
    },
  )
})

describe('machineRoomSheet: móc treo', () => {
  it('móc ở tâm: kích thước ra AH/2 và BH/2', () => {
    const h = words(clone('house-5f'))
    expect(h).toContain('750')
    expect(h).toContain('950')
    const o = words(clone('hotel-9f'))
    expect(o).toContain('900')
    expect(o).toContain('1000')
  })

  it('móc lệch (x = 400, y = 600): ngang = AH − 400, dọc = 600', () => {
    const p = clone('house-5f')
    p.topRoom.hook.x = 400
    p.topRoom.hook.y = 600
    const ws = words(p)
    expect(ws).toContain(String(p.tech.shaft.width - 400)) // 1100
    expect(ws).toContain('600')
    // kích thước tâm cũ không còn
    expect(ws).not.toContain('750')
    expect(ws).not.toContain('950')
  })

  it('CPM đổi thì nhãn CPM đổi', () => {
    const p = clone('house-5f')
    p.topRoom.cpm = { w: 900, h: 1300 }
    expect(words(p)).toContain('CPM 900 x 1300')
  })

  it('CPM rộng hơn hố vẫn không ném lỗi, không NaN', () => {
    const p = clone('house-5f')
    p.topRoom.cpm = { w: 2000, h: 1200 }
    const out = draw(p)
    for (const q of out)
      for (const n of numbersOf(q)) expect(Number.isFinite(n)).toBe(true)
  })

  it('thông số lạ không sinh NaN và vẫn nằm trong vùng vẽ', () => {
    const p = clone('house-5f')
    p.tech.shaft.width = 2200
    p.tech.shaft.depth = 2500
    p.tech.door.width = 900
    p.tech.car.width = 1600
    p.tech.car.depth = 1500
    const out = draw(p)
    for (const q of out)
      for (const n of numbersOf(q)) expect(Number.isFinite(n)).toBe(true)
    expectInside(out, SHEET_AREA)
  })
})

describe('machineRoomSheet: biên CPM và móc treo', () => {
  /** Kiểu đỡ sàn: tường bên là một khối đầy, đọc được mặt trong từ nét vẽ. */
  const floorRoom = (id: 'house-5f' | 'hotel-9f' = 'house-5f') => {
    const p = clone(id)
    p.topRoom.machineSupport = 'floor'
    return p
  }
  const finite = (out: ReturnType<typeof draw>) => {
    for (const q of out)
      for (const n of numbersOf(q)) expect(Number.isFinite(n)).toBe(true)
  }

  it('CPM = AH vẫn hợp lệ: nhãn đủ, nằm trong vùng vẽ', () => {
    const p = floorRoom()
    p.topRoom.cpm.w = p.tech.shaft.width
    const out = draw(p)
    finite(out)
    expectInside(out, SHEET_AREA)
    expect(texts(out).map((t) => t.text)).toContain('CPM 1500 x 1200')
  })

  it('CPM hẹp (500): nhãn nằm trong bề rộng ô CPM trên giấy', () => {
    const p = floorRoom()
    p.topRoom.cpm = { w: 500, h: 1200 }
    const out = draw(p)
    finite(out)
    const g = sideWalls(out, p.tech.shaft.width)
    const label = texts(out).find((t) => t.text.startsWith('CPM'))!
    expect(label).toBeDefined()
    const [x0, x1] = textSpan(label)
    expect(x0).toBeGreaterThanOrEqual(g.innerL - EPS)
    expect(x1).toBeLessThanOrEqual(g.innerL + 500 * g.k + EPS)
    // Co lại hoặc cắt "…", nhưng vẫn là nhãn CPM.
    expect(label.text.startsWith('CPM')).toBe(true)
  })

  it('CPM rất hẹp (200): nhãn vẫn nằm trong ô, không NaN', () => {
    const p = floorRoom()
    p.topRoom.cpm = { w: 200, h: 1200 }
    const out = draw(p)
    finite(out)
    const g = sideWalls(out, p.tech.shaft.width)
    const label = texts(out).find((t) => t.text.startsWith('CPM'))!
    const [x0, x1] = textSpan(label)
    expect(x0).toBeGreaterThanOrEqual(g.innerL - EPS)
    expect(x1).toBeLessThanOrEqual(g.innerL + 200 * g.k + EPS)
  })

  it.each(['floor', 'beams'] as const)(
    'móc sát tường trái (x = 100, y = BH − 100), %s: kích thước đúng, nhãn trong hố',
    (support) => {
      const p = clone('house-5f')
      p.topRoom.machineSupport = support
      p.topRoom.hook.x = 100
      p.topRoom.hook.y = p.tech.shaft.depth - 100
      const out = draw(p)
      finite(out)
      expectInside(out, SHEET_AREA)
      const ws = texts(out).map((t) => t.text)
      expect(ws).toContain(String(p.tech.shaft.width - 100)) // 1400
      expect(ws).toContain(String(p.tech.shaft.depth - 100)) // 1800
    },
  )

  it('móc sát tường trái: nhãn "vị trí móc treo" nằm trong mặt trong hố theo x', () => {
    const p = floorRoom()
    p.topRoom.hook.x = 100
    p.topRoom.hook.y = p.tech.shaft.depth - 100
    const out = draw(p)
    const g = sideWalls(out, p.tech.shaft.width)
    const label = texts(out).find((t) => t.text === HOOK_LABEL)!
    const [x0, x1] = textSpan(label)
    expect(x0).toBeGreaterThanOrEqual(g.innerL - EPS)
    expect(x1).toBeLessThanOrEqual(g.innerR + EPS)
  })

  it('móc sát tường phải (x = AH − 100): kích thước 100, nhãn không tràn qua tường phải', () => {
    const p = floorRoom()
    p.topRoom.hook.x = p.tech.shaft.width - 100
    const out = draw(p)
    finite(out)
    expectInside(out, SHEET_AREA)
    const ws = texts(out).map((t) => t.text)
    expect(ws).toContain('100') // AH − x
    expect(ws).toContain(String(p.tech.shaft.depth / 2)) // y mặc định ở tâm
    const g = sideWalls(out, p.tech.shaft.width)
    const label = texts(out).find((t) => t.text === HOOK_LABEL)!
    const [x0, x1] = textSpan(label)
    expect(x0).toBeGreaterThanOrEqual(g.innerL - EPS)
    expect(x1).toBeLessThanOrEqual(g.innerR + EPS)
  })

  it.each([
    [100, 950],
    [750, 100],
    [1400, 1800],
    [750, 950],
  ])('móc (x = %i, y = %i): nhãn luôn nằm trong mặt trong hố', (x, y) => {
    const p = floorRoom()
    p.topRoom.hook.x = x
    p.topRoom.hook.y = y
    const out = draw(p)
    const g = sideWalls(out, p.tech.shaft.width)
    const label = texts(out).find((t) => t.text === HOOK_LABEL)!
    const [x0, x1] = textSpan(label)
    expect(x0).toBeGreaterThanOrEqual(g.innerL - EPS)
    expect(x1).toBeLessThanOrEqual(g.innerR + EPS)
  })
})
