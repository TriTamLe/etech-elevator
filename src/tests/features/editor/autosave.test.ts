import { describe, expect, it } from 'vitest'

import { saveStatus, shouldSave, snapshot } from '#/features/editor/autosave'
import type { SaveInputs } from '#/features/editor/autosave'
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

describe('saveStatus', () => {
  const at = new Date(2026, 10, 3, 9, 30)
  const base: SaveInputs = {
    online: true,
    pending: false,
    valid: true,
    errors: 0,
    dirty: false,
    last: { kind: 'saved', at },
    retry: () => {},
  }
  const kind = (over: Partial<SaveInputs>) => saveStatus({ ...base, ...over }).kind

  it('saved, edited (pending debounce), saving', () => {
    expect(saveStatus(base)).toEqual({ kind: 'saved', at })
    expect(kind({ dirty: true })).toBe('pending')
    expect(kind({ pending: true })).toBe('saving')
  })

  it('a save queued behind another while online is "saving", not offline', () => {
    expect(kind({ pending: true, dirty: true })).toBe('saving')
  })

  it('offline with a save waiting or valid unsaved edits', () => {
    expect(kind({ online: false, pending: true })).toBe('offline')
    expect(kind({ online: false, dirty: true })).toBe('offline')
  })

  it('offline with nothing to save keeps the last result', () => {
    expect(kind({ online: false })).toBe('saved')
  })

  it('shape errors: invalid with the count, even offline', () => {
    expect(saveStatus({ ...base, valid: false, errors: 3, dirty: true })).toEqual({
      kind: 'invalid',
      count: 3,
    })
    expect(kind({ online: false, valid: false, errors: 1, dirty: true })).toBe('invalid')
  })

  it('a failed save with edits left offers retry', () => {
    const retry = () => {}
    expect(
      saveStatus({ ...base, dirty: true, last: { kind: 'error' }, retry }),
    ).toEqual({ kind: 'error', retry })
  })

  it('idle before any save result', () => {
    expect(kind({ last: null })).toBe('idle')
  })
})
