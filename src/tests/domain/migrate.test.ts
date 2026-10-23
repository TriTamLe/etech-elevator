import { describe, expect, it } from 'vitest'
import { ZodError } from 'zod'

import { migrate, migrateImport } from '#/domain/migrate'
import { presetParams } from '#/domain/presets'
import { CURRENT_SCHEMA_VERSION } from '#/domain/schema'

describe('migrate', () => {
  it('v1 hợp lệ đi qua và giữ nguyên dữ liệu', () => {
    const p = presetParams('house-5f')
    expect(migrate(structuredClone(p))).toEqual(p)
  })

  it('phiên bản mới hơn thì throw', () => {
    const p = {
      ...presetParams('house-5f'),
      schemaVersion: CURRENT_SCHEMA_VERSION + 1,
    }
    expect(() => migrate(p)).toThrow(/mới hơn/)
  })

  it('thiếu hoặc sai schemaVersion thì throw', () => {
    const { schemaVersion: _omit, ...rest } = presetParams('house-5f')
    expect(() => migrate(rest)).toThrow(/schemaVersion/)
    expect(() => migrate({ ...rest, schemaVersion: '1' })).toThrow(
      /schemaVersion/,
    )
    expect(() => migrate({ ...rest, schemaVersion: 0 })).toThrow(
      /schemaVersion/,
    )
    expect(() => migrate({ ...rest, schemaVersion: 1.5 })).toThrow(
      /schemaVersion/,
    )
  })

  it('không phải object thì throw', () => {
    for (const bad of [null, undefined, 42, 'abc', [], true]) {
      expect(() => migrate(bad)).toThrow(/không hợp lệ/)
    }
  })

  it('đúng version nhưng sai shape thì throw ZodError', () => {
    const p = presetParams('house-5f') as Record<string, any>
    p.tech.shaft.width = 'rộng'
    expect(() => migrate(p)).toThrow(ZodError)
    expect(() => migrate({ schemaVersion: 1 })).toThrow(ZodError)
  })
})

describe('migrateImport', () => {
  it('passes valid params through', () => {
    const p = presetParams('house-5f')
    expect(migrateImport(structuredClone(p))).toEqual(p)
  })

  it('turns a shape error into one Vietnamese sentence with the path', () => {
    const bad = { ...presetParams('house-5f'), tech: { loadKg: 'x' } }
    expect(() => migrateImport(bad)).toThrow(/^File không đúng cấu trúc thông số \(sai ở “tech\./)
  })

  it('keeps the version errors as they are', () => {
    expect(() => migrateImport({ schemaVersion: 99 })).toThrow(/phiên bản 99/)
  })
})
