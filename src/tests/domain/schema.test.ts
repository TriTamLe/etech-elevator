import { describe, expect, it } from 'vitest'

import { PRESETS, presetParams } from '#/domain/presets'
import type { PresetId } from '#/domain/presets'
import {
  CURRENT_SCHEMA_VERSION,
  ElevatorParams,
  makeFloors,
} from '#/domain/schema'

describe('presets qua Zod', () => {
  it('có đúng 2 bộ mẫu', () => {
    expect(PRESETS.map((p) => p.id).sort()).toEqual(['hotel-9f', 'house-5f'])
  })

  it.each(PRESETS.map((p) => p.id))('bộ mẫu %s parse không lỗi', (id) => {
    const r = ElevatorParams.safeParse(presetParams(id))
    expect(r.success).toBe(true)
  })

  it.each(PRESETS.map((p) => p.id))('%s: số tầng khớp số điểm dừng', (id) => {
    const p = presetParams(id)
    expect(p.floors.length).toBe(p.tech.stops)
    expect(p.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
  })

  it('từ chối kích thước âm hoặc thiếu tên công trình', () => {
    const bad = presetParams('house-5f')
    bad.tech.shaft.width = -1
    expect(ElevatorParams.safeParse(bad).success).toBe(false)
    const bad2 = presetParams('house-5f')
    bad2.project.name = ''
    expect(ElevatorParams.safeParse(bad2).success).toBe(false)
  })
})

describe('presetParams', () => {
  it('trả bản sao độc lập, sửa không ảnh hưởng preset gốc', () => {
    const a = presetParams('house-5f')
    const b = presetParams('house-5f')
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
    a.tech.shaft.width = 9999
    a.floors[0].height = 1
    a.topRoom.cpm.w = 1
    expect(b.tech.shaft.width).toBe(1500)
    expect(presetParams('house-5f').tech.shaft.width).toBe(1500)
    expect(presetParams('house-5f').floors[0].height).toBe(3900)
    expect(presetParams('house-5f').topRoom.cpm.w).toBe(800)
  })

  it('id không tồn tại thì throw', () => {
    expect(() => presetParams('khong-co' as PresetId)).toThrow()
  })
})

describe('makeFloors', () => {
  it('tạo đúng số tầng, tên 1F..NF, 1F bao che rộng, còn lại hẹp, chưa nhập chiều cao', () => {
    const f = makeFloors(4)
    expect(f.map((x) => x.name)).toEqual(['1F', '2F', '3F', '4F'])
    expect(f[0].jamb).toBe('wide')
    expect(f.slice(1).every((x) => x.jamb === 'narrow')).toBe(true)
    expect(f.every((x) => x.height === null && x.hasDoor)).toBe(true)
  })
})
