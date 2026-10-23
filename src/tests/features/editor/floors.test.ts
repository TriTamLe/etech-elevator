import { describe, expect, it } from 'vitest'

import { resizeFloors, wouldDropEdited } from '#/features/editor/floors'
import { presetParams } from '#/domain/presets'
import { makeFloors } from '#/domain/schema'

describe('resizeFloors', () => {
  it('grows 5 -> 7: keeps first 5, appends default 6F and 7F', () => {
    const floors = structuredClone(presetParams('house-5f').floors)
    const out = resizeFloors(floors, 7)
    expect(out).toHaveLength(7)
    expect(out.slice(0, 5)).toEqual(floors)
    expect(out[5]).toEqual({
      name: '6F',
      height: null,
      jamb: 'narrow',
      hasDoor: true,
    })
    expect(out[6]).toEqual({
      name: '7F',
      height: null,
      jamb: 'narrow',
      hasDoor: true,
    })
  })

  it('shrinks 5 -> 3: keeps first 3; a valid height on the new top floor stays', () => {
    const floors = structuredClone(presetParams('house-5f').floors)
    expect(resizeFloors(floors, 3)).toEqual(floors.slice(0, 3))
  })

  it('clears an invalid height on the row that becomes the top floor', () => {
    const floors = makeFloors(6)
    floors[4].height = Number.NaN
    expect(resizeFloors(floors, 5)[4].height).toBeNull()
  })

  it('same size returns equal rows', () => {
    const floors = structuredClone(presetParams('house-5f').floors)
    expect(resizeFloors(floors, 5)).toEqual(floors)
  })

  it('does not mutate the input', () => {
    const floors = structuredClone(presetParams('house-5f').floors)
    const copy = structuredClone(floors)
    resizeFloors(floors, 8)
    expect(floors).toEqual(copy)
  })
})

describe('wouldDropEdited', () => {
  it('false when growing or staying the same', () => {
    const floors = structuredClone(presetParams('house-5f').floors)
    expect(wouldDropEdited(floors, 7)).toBe(false)
    expect(wouldDropEdited(floors, 5)).toBe(false)
  })

  it('false when dropped rows equal the defaults', () => {
    const floors = makeFloors(6)
    expect(wouldDropEdited(floors, 3)).toBe(false)
  })

  it('true when a dropped row has a height', () => {
    const floors = makeFloors(6)
    floors[4].height = 3600
    expect(wouldDropEdited(floors, 3)).toBe(true)
  })

  it('true when a dropped row was renamed', () => {
    const floors = makeFloors(6)
    floors[5].name = 'Mái'
    expect(wouldDropEdited(floors, 4)).toBe(true)
  })

  it('true when a dropped row changed jamb', () => {
    const floors = makeFloors(6)
    floors[3].jamb = 'wide'
    expect(wouldDropEdited(floors, 3)).toBe(true)
  })

  it('true when a dropped row changed hasDoor', () => {
    const floors = makeFloors(6)
    floors[5].hasDoor = false
    expect(wouldDropEdited(floors, 5)).toBe(true)
  })

  it('edits in kept rows do not count', () => {
    const floors = makeFloors(6)
    floors[0].height = 4000
    floors[1].name = 'Lửng'
    expect(wouldDropEdited(floors, 3)).toBe(false)
  })

  it('house-5f shrinking to 3 -> true (4F has a height)', () => {
    const floors = structuredClone(presetParams('house-5f').floors)
    expect(wouldDropEdited(floors, 3)).toBe(true)
  })

  it('house-5f shrinking to 4 -> false (only default 5F dropped)', () => {
    const floors = structuredClone(presetParams('house-5f').floors)
    expect(wouldDropEdited(floors, 4)).toBe(false)
  })
})

describe('wouldDropEdited — hidden top-floor height', () => {
  it('ignores a height kept on the current top floor (its input is hidden)', () => {
    const floors = makeFloors(4)
    floors[3].height = 3600
    expect(wouldDropEdited(floors, 3)).toBe(false)
  })

  it('still counts a height on a dropped floor below the top', () => {
    const floors = makeFloors(5)
    floors[3].height = 3600
    expect(wouldDropEdited(floors, 3)).toBe(true)
  })
})
