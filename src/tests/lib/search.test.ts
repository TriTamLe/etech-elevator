import { describe, expect, it } from 'vitest'

import { foldVi, matchesQuery } from '#/lib/search'

describe('foldVi', () => {
  it('strips Vietnamese marks and đ', () => {
    expect(foldVi('Đà Nẵng')).toBe('da nang')
    expect(foldVi('  KHÁCH SẠN Ở  ')).toBe('khach san o')
    expect(foldVi('')).toBe('')
  })
})

describe('matchesQuery', () => {
  const row = ['CÔNG TRÌNH MẪU 2 – NHÀ Ở 5 TẦNG', 'TP Đà Nẵng']

  it('matches without diacritics, across name and address', () => {
    expect(matchesQuery(row, 'nha o')).toBe(true)
    expect(matchesQuery(row, 'da nang')).toBe(true)
    expect(matchesQuery(row, 'tầng nẵng')).toBe(true)
  })

  it('matches on the address alone', () => {
    expect(matchesQuery(['NHÀ ANH BA', '12 Lê Lợi, Hải Châu'], 'le loi')).toBe(true)
    expect(matchesQuery(['NHÀ ANH BA', '12 Lê Lợi, Hải Châu'], 'hai chau 12')).toBe(true)
  })

  it('requires every word', () => {
    expect(matchesQuery(row, 'nha hue')).toBe(false)
  })

  it('treats an empty query as a match', () => {
    expect(matchesQuery(row, '   ')).toBe(true)
  })
})
