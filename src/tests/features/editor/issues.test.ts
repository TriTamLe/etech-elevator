import { describe, expect, it } from 'vitest'

import { collectIssues, fieldKey, pathKey, sectionOf } from '#/features/editor/issues'
import { presetParams } from '#/domain/presets'

describe('collectIssues', () => {
  it.each(['hotel-9f', 'house-5f'] as const)('preset %s: valid, no errors, no warnings', (id) => {
    const r = collectIssues(presetParams(id))
    expect(r.params).not.toBeNull()
    expect(r.errors).toBe(0)
    expect(r.warnings).toBe(0)
    expect(r.list).toEqual([])
    expect(r.byPath.size).toBe(0)
  })

  it('blank mm field (NaN) -> params null, "Nhập một số." at the path, no cross-field rules', () => {
    const v = structuredClone(presetParams('house-5f'))
    v.tech.shaft.width = Number.NaN
    const r = collectIssues(v)
    expect(r.params).toBeNull()
    expect(r.byPath.get('tech.shaft.width')?.[0]).toMatchObject({
      level: 'error',
      path: 'tech.shaft.width',
      message: 'Nhập một số.',
    })
    expect(r.warnings).toBe(0)
    expect(r.list.every((i) => i.level === 'error')).toBe(true)
    expect(r.errors).toBe(r.list.length)
  })

  it('cross-field rules are skipped while the shape is invalid', () => {
    // pit below the speed reference would warn, but shape error hides it
    const v = structuredClone(presetParams('house-5f'))
    v.tech.pit = 100
    v.tech.shaft.width = Number.NaN
    const r = collectIssues(v)
    expect(r.params).toBeNull()
    expect(r.byPath.has('tech.pit')).toBe(false)
    expect(r.warnings).toBe(0)
  })

  it('negative number -> "Phải lớn hơn 0."', () => {
    const v = structuredClone(presetParams('house-5f'))
    v.tech.pit = -5
    const r = collectIssues(v)
    expect(r.params).toBeNull()
    expect(r.byPath.get('tech.pit')?.[0].message).toBe('Phải lớn hơn 0.')
    expect(r.byPath.get('tech.pit')?.[0].level).toBe('error')
  })

  it('empty project name -> "Không được để trống."', () => {
    const v = structuredClone(presetParams('house-5f'))
    v.project.name = ''
    const r = collectIssues(v)
    expect(r.params).toBeNull()
    expect(r.byPath.get('project.name')?.[0].message).toBe('Không được để trống.')
  })

  it('floor height 0 -> issue at floors.1.height', () => {
    const v = structuredClone(presetParams('house-5f'))
    v.floors[1].height = 0
    const r = collectIssues(v)
    expect(r.params).toBeNull()
    expect(r.byPath.has('floors.1.height')).toBe(true)
    expect(r.byPath.get('floors.1.height')?.[0].level).toBe('error')
  })

  it('cross-field error: car.width 1200 in a 1500 shaft', () => {
    const v = structuredClone(presetParams('house-5f'))
    v.tech.car.width = 1200
    const r = collectIssues(v)
    expect(r.params).not.toBeNull()
    expect(r.byPath.get('tech.car.width')?.[0].level).toBe('error')
    expect(r.errors).toBeGreaterThanOrEqual(1)
    expect(r.warnings).toBe(0)
  })

  it('cross-field warning: pit 100 -> "kỹ sư cần xác nhận"', () => {
    const v = structuredClone(presetParams('house-5f'))
    v.tech.pit = 100
    const r = collectIssues(v)
    expect(r.params).not.toBeNull()
    const w = r.byPath.get('tech.pit')?.[0]
    expect(w?.level).toBe('warning')
    expect(w?.message).toContain('kỹ sư cần xác nhận')
    expect(r.errors).toBe(0)
    expect(r.warnings).toBe(1)
  })

  it('counts errors and warnings separately', () => {
    const v = structuredClone(presetParams('house-5f'))
    v.tech.car.width = 1200 // error
    v.tech.pit = 100 // warning
    const r = collectIssues(v)
    expect(r.errors).toBe(r.list.filter((i) => i.level === 'error').length)
    expect(r.warnings).toBe(r.list.filter((i) => i.level === 'warning').length)
    expect(r.errors).toBeGreaterThanOrEqual(1)
    expect(r.warnings).toBe(1)
    expect(r.errors + r.warnings).toBe(r.list.length)
  })

  it('byPath groups several issues on one path', () => {
    // shaft 1000: both jambs in use (wide 1100, narrow 900) exceed the allowed opening
    const v = structuredClone(presetParams('house-5f'))
    v.tech.shaft.width = 1000
    const r = collectIssues(v)
    expect(r.params).not.toBeNull()
    const bucket = r.byPath.get('tech.shaft.width')
    expect(bucket).toBeDefined()
    expect(bucket!.length).toBeGreaterThanOrEqual(2)
    expect(bucket!.every((i) => i.path === 'tech.shaft.width')).toBe(true)
    // every listed issue is reachable through byPath
    const total = [...r.byPath.values()].reduce((n, b) => n + b.length, 0)
    expect(total).toBe(r.list.length)
  })
})

describe('path helpers', () => {
  it('fieldKey converts bracket indexes to dotted', () => {
    expect(fieldKey('floors[2].height')).toBe('floors.2.height')
    expect(fieldKey('tech.car.width')).toBe('tech.car.width')
  })

  it('pathKey joins zod paths', () => {
    expect(pathKey(['floors', 2, 'height'])).toBe('floors.2.height')
    expect(pathKey([])).toBe('')
  })

  it('sectionOf maps a path to its accordion section', () => {
    expect(sectionOf('floors.3.jamb')).toBe('floors')
    expect(sectionOf('schemaVersion')).toBe('project')
    expect(sectionOf('tech.car.width')).toBe('tech')
  })
})
