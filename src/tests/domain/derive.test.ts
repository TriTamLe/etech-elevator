import { describe, expect, it } from 'vitest'

import {
  derive,
  effectiveCategory,
  floorGroups,
  heightTableRows,
  hookPosition,
  jambFloorsLabel,
  jambsInUse,
  landingOpening,
  pageList,
  shaftTotalHeight,
  suggestedCategory,
  titleBlockAddress,
} from '#/domain/derive'
import { presetParams } from '#/domain/presets'
import { makeFloors } from '#/domain/schema'

const labels = (n: number) =>
  floorGroups(makeFloors(n))
    .map((g) => g.label)
    .join(' · ')

describe('floorGroups', () => {
  it('N=3 và N=4: không gộp, đủ từng tầng', () => {
    expect(labels(3)).toBe('1F · 2F · 3F(OH)')
    expect(labels(4)).toBe('1F · 2F · 3F · 4F(OH)')
    for (const n of [3, 4]) {
      expect(floorGroups(makeFloors(n)).every((g) => !g.collapsed)).toBe(true)
    }
  })

  it('N=5: 1F · 2F~3F · 4F · 5F(OH), nhóm gộp có collapsed', () => {
    const g = floorGroups(makeFloors(5))
    expect(g.map((x) => x.label).join(' · ')).toBe('1F · 2F~3F · 4F · 5F(OH)')
    expect(g.map((x) => x.collapsed)).toEqual([false, true, false, false])
    expect(g.map((x) => x.isTop)).toEqual([false, false, false, true])
    expect(g[1].indices).toEqual([1, 2])
  })

  it('N=9', () => {
    expect(labels(9)).toBe('1F · 2F~7F · 8F · 9F(OH)')
  })

  it('N=20', () => {
    expect(labels(20)).toBe('1F · 2F~18F · 19F · 20F(OH)')
  })
})

describe('heightTableRows', () => {
  it('house-5f: 5F 4800 · 4F 3600 · 2F-3F 3600 · 1F 3900 · PIT 1400', () => {
    expect(heightTableRows(presetParams('house-5f'))).toEqual([
      { label: '5F', value: 4800 },
      { label: '4F', value: 3600 },
      { label: '2F-3F', value: 3600 },
      { label: '1F', value: 3900 },
      { label: 'PIT', value: 1400 },
    ])
  })

  it('tách dòng khi chiều cao trong nhóm gộp khác nhau', () => {
    const p = presetParams('house-5f')
    p.floors[2].height = 3300
    expect(heightTableRows(p)).toEqual([
      { label: '5F', value: 4800 },
      { label: '4F', value: 3600 },
      { label: '3F', value: 3300 },
      { label: '2F', value: 3600 },
      { label: '1F', value: 3900 },
      { label: 'PIT', value: 1400 },
    ])
  })

  it('tầng chưa nhập chiều cao thì value null (in "…….")', () => {
    const p = presetParams('house-5f')
    p.floors[0].height = null
    p.floors[1].height = null
    p.floors[2].height = null
    const rows = heightTableRows(p)
    expect(rows.find((r) => r.label === '2F-3F')?.value).toBeNull()
    expect(rows.find((r) => r.label === '1F')?.value).toBeNull()
    // nhóm có tầng nhập, tầng không: tách dòng, tầng trống là null
    const q = presetParams('house-5f')
    q.floors[1].height = null
    const r2 = heightTableRows(q)
    expect(r2.find((r) => r.label === '2F')?.value).toBeNull()
    expect(r2.find((r) => r.label === '3F')?.value).toBe(3600)
  })

  it('hotel-9f chưa nhập: mọi dòng tầng thường là null, PIT 1500', () => {
    const rows = heightTableRows(presetParams('hotel-9f'))
    expect(rows[0]).toEqual({ label: '9F', value: 5100 })
    expect(rows.at(-1)).toEqual({ label: 'PIT', value: 1500 })
    expect(rows.slice(1, -1).every((r) => r.value === null)).toBe(true)
  })
})

describe('landingOpening', () => {
  it('house-5f (AH 1500, OP 700): hẹp 900/300, rộng 1100/200', () => {
    const p = presetParams('house-5f')
    expect(landingOpening(p, 'narrow')).toEqual({ width: 900, side: 300 })
    expect(landingOpening(p, 'wide')).toEqual({ width: 1100, side: 200 })
  })

  it('hotel-9f (AH 1800, OP 800): hẹp 1000/400, rộng 1100/350', () => {
    const p = presetParams('hotel-9f')
    expect(landingOpening(p, 'narrow')).toEqual({ width: 1000, side: 400 })
    expect(landingOpening(p, 'wide')).toEqual({ width: 1100, side: 350 })
  })
})

describe('shaftTotalHeight', () => {
  it('house-5f = 20900', () => {
    expect(shaftTotalHeight(presetParams('house-5f'))).toBe(20900)
  })

  it('thiếu chiều cao một tầng bất kỳ (trừ tầng đỉnh) thì null', () => {
    for (let i = 0; i < 4; i++) {
      const p = presetParams('house-5f')
      p.floors[i].height = null
      expect(shaftTotalHeight(p)).toBeNull()
    }
  })

  it('chiều cao tầng đỉnh không ảnh hưởng', () => {
    const p = presetParams('house-5f')
    p.floors[4].height = 1234
    expect(shaftTotalHeight(p)).toBe(20900)
  })

  it('hotel-9f chưa nhập thì null, nhập đủ thì cộng đúng', () => {
    const p = presetParams('hotel-9f')
    expect(shaftTotalHeight(p)).toBeNull()
    for (const f of p.floors) f.height = 3000
    expect(shaftTotalHeight(p)).toBe(1500 + 8 * 3000 + 3600 + 1500)
  })
})

describe('hookPosition', () => {
  it('mặc định ở tâm hố', () => {
    expect(hookPosition(presetParams('house-5f'))).toEqual({ x: 750, y: 950 })
    expect(hookPosition(presetParams('hotel-9f'))).toEqual({ x: 900, y: 1000 })
  })

  it('giá trị sửa tay được ưu tiên, từng trục độc lập', () => {
    const p = presetParams('house-5f')
    p.topRoom.hook.x = 600
    expect(hookPosition(p)).toEqual({ x: 600, y: 950 })
    p.topRoom.hook.y = 400
    expect(hookPosition(p)).toEqual({ x: 600, y: 400 })
  })
})

describe('pageList', () => {
  it('đủ 9 trang, DTP 01 → DTP 08 liền mạch, bìa không mã', () => {
    const pages = pageList(presetParams('house-5f'))
    expect(pages.map((p) => p.key)).toEqual([
      'cover',
      'responsibility',
      'spec',
      'plan',
      'pit',
      'section',
      'landing-wide',
      'landing-narrow',
      'machine-room',
    ])
    expect(pages.map((p) => p.code)).toEqual([
      '',
      'DTP 01',
      'DTP 02',
      'DTP 03',
      'DTP 04',
      'DTP 05',
      'DTP 06',
      'DTP 07',
      'DTP 08',
    ])
  })

  it('chỉ bao che hẹp: 1 trang cửa tầng, 8 trang, phòng máy là DTP 07', () => {
    const p = presetParams('house-5f')
    for (const f of p.floors) f.jamb = 'narrow'
    const pages = pageList(p)
    expect(pages).toHaveLength(8)
    expect(pages.filter((x) => x.key.startsWith('landing'))).toHaveLength(1)
    expect(pages.some((x) => x.key === 'landing-wide')).toBe(false)
    expect(pages.at(-1)).toMatchObject({ key: 'machine-room', code: 'DTP 07' })
    expect(pages.map((x) => x.code).slice(1)).toEqual(
      Array.from({ length: 7 }, (_, i) => `DTP 0${i + 1}`),
    )
  })

  it('tầng không có cửa không tính vào loại bao che đang dùng', () => {
    const p = presetParams('house-5f')
    p.floors[0].hasDoor = false
    expect(jambsInUse(p.floors)).toEqual(['narrow'])
  })

  it('buồng trên cùng (machine-room) luôn có, kể cả MRL', () => {
    const p = presetParams('house-5f')
    expect(p.tech.liftType).toBe('mrl')
    expect(pageList(p).some((x) => x.key === 'machine-room')).toBe(true)
  })
})

describe('jambFloorsLabel', () => {
  it('house-5f', () => {
    const f = presetParams('house-5f').floors
    expect(jambFloorsLabel(f, 'narrow')).toBe('Tầng 2F ~ 5F')
    expect(jambFloorsLabel(f, 'wide')).toBe('Tầng 1F')
  })

  it('không liền nhau thì nối bằng ", "', () => {
    const f = makeFloors(6)
    f[2].jamb = 'wide'
    expect(jambFloorsLabel(f, 'narrow')).toBe('Tầng 2F, 4F ~ 6F')
    expect(jambFloorsLabel(f, 'wide')).toBe('Tầng 1F, 3F')
  })

  it('không có tầng nào dùng thì chuỗi rỗng', () => {
    const f = makeFloors(3).map((x) => ({ ...x, jamb: 'narrow' as const }))
    expect(jambFloorsLabel(f, 'wide')).toBe('')
  })
})

describe('hạng mục, địa chỉ, mã hiệu, CPM', () => {
  it('suggestedCategory và effectiveCategory', () => {
    const p = presetParams('house-5f')
    expect(suggestedCategory(p)).toBe(
      'THANG TẢI KHÁCH - TẢI TRỌNG 550 KG - SỐ LƯỢNG : 1 THANG',
    )
    expect(effectiveCategory(p)).toBe(suggestedCategory(p))
    p.project.category = 'HẠNG MỤC TỰ NHẬP'
    expect(effectiveCategory(p)).toBe('HẠNG MỤC TỰ NHẬP')
    p.project.category = '   '
    expect(effectiveCategory(p)).toBe(suggestedCategory(p))
  })

  it('titleBlockAddress dùng địa chỉ ngắn nếu có, ngược lại địa chỉ đầy đủ', () => {
    expect(titleBlockAddress(presetParams('house-5f'))).toBe('ĐƯỜNG MẪU - TPĐN')
    expect(titleBlockAddress(presetParams('hotel-9f'))).toBe('TP ĐÀ NẴNG')
  })

  it('modelCode là chữ tự do, giữ nguyên, không sinh từ tốc độ', () => {
    const p = presetParams('house-5f')
    p.tech.modelCode = 'Mã tự đặt ABC-123'
    p.tech.speed = 105
    const d = derive(p)
    expect(p.tech.modelCode).toBe('Mã tự đặt ABC-123')
    expect(JSON.stringify(d)).not.toContain('CO60')
    expect(presetParams('house-5f').tech.modelCode).toBe(
      'MRL - 550 - CO60 - 5/5',
    )
  })

  it('CPM chỉ có một giá trị 800×1200 ở cả 2 bộ mẫu', () => {
    for (const id of ['house-5f', 'hotel-9f'] as const) {
      expect(presetParams(id).topRoom.cpm).toEqual({ w: 800, h: 1200 })
    }
  })

  it('derive gộp đúng các giá trị', () => {
    const d = derive(presetParams('house-5f'))
    expect(d.shaftTotalHeight).toBe(20900)
    expect(d.hook).toEqual({ x: 750, y: 950 })
    expect(d.openings.narrow).toEqual({ width: 900, side: 300 })
    expect(d.openings.wide).toEqual({ width: 1100, side: 200 })
    expect(d.pages).toHaveLength(9)
    expect(d.heightRows).toHaveLength(5)
  })
})
