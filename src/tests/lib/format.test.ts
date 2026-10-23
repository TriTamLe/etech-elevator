import { describe, expect, it } from 'vitest'

import { formatTime, formatUpdatedAt } from '#/lib/format'

describe('formatUpdatedAt', () => {
  const now = new Date('2026-10-23T08:00:00Z')

  it('prints Vietnam time (UTC+7) with day/month', () => {
    expect(formatUpdatedAt(new Date('2026-10-22T07:32:00Z'), now)).toBe(
      '14:32 · 22/10',
    )
  })

  it('rolls the date over at Vietnam midnight', () => {
    expect(formatUpdatedAt(new Date('2026-10-22T17:05:00Z'), now)).toBe(
      '00:05 · 23/10',
    )
  })

  it('adds the year for another year', () => {
    expect(formatUpdatedAt(new Date('2025-03-01T01:00:00Z'), now)).toBe(
      '08:00 · 01/03/2025',
    )
  })
})

describe('formatTime', () => {
  it('uses a 24-hour clock', () => {
    expect(formatTime(new Date('2026-10-23T13:09:00Z'))).toBe('20:09')
  })
})
