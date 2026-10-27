import { describe, expect, it } from 'vitest'

import {
  formatDate,
  formatDecimal,
  formatTime,
  formatUpdatedAt,
} from '#/lib/format'

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

describe('formatDate', () => {
  it('prints dd/mm/yyyy in Vietnam time', () => {
    expect(formatDate(new Date('2026-10-22T17:05:00Z'))).toBe('23/10/2026')
  })
})

describe('formatDecimal', () => {
  it('số lẻ dùng dấu phẩy, số nguyên giữ nguyên', () => {
    expect(formatDecimal(2.5)).toBe('2,5')
    expect(formatDecimal(0.75)).toBe('0,75')
    expect(formatDecimal(90)).toBe('90')
    expect(formatDecimal(20900)).toBe('20900')
    expect(formatDecimal(1500.5)).toBe('1500,5')
  })
})
