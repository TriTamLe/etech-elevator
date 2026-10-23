import { describe, expect, it } from 'vitest'

import { shouldSave, snapshot } from '#/features/editor/autosave'
import { presetParams } from '#/domain/presets'

describe('autosave', () => {
  it('snapshot is stable for equal params and differs after a change', () => {
    const a = presetParams('house-5f')
    const b = presetParams('house-5f')
    expect(snapshot(a)).toBe(snapshot(b))
    b.tech.pit = a.tech.pit + 1
    expect(snapshot(a)).not.toBe(snapshot(b))
  })

  it('shouldSave is false for null params', () => {
    expect(shouldSave('', null)).toBe(false)
    expect(shouldSave(snapshot(presetParams('house-5f')), null)).toBe(false)
  })

  it('shouldSave is false when the snapshot equals lastSaved', () => {
    const p = presetParams('hotel-9f')
    expect(shouldSave(snapshot(p), p)).toBe(false)
    expect(shouldSave(snapshot(p), structuredClone(p))).toBe(false)
  })

  it('shouldSave is true after any change', () => {
    const p = presetParams('house-5f')
    const last = snapshot(p)
    const changed = structuredClone(p)
    changed.project.name = `${p.project.name} x`
    expect(shouldSave(last, changed)).toBe(true)
    const floorChange = structuredClone(p)
    floorChange.floors[0].height = 1234
    expect(shouldSave(last, floorChange)).toBe(true)
  })

  it('shouldSave is true when nothing was saved yet', () => {
    expect(shouldSave('', presetParams('house-5f'))).toBe(true)
  })
})
