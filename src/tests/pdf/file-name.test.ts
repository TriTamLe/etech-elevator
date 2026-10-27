import { describe, expect, it } from 'vitest'

import { formatFileDate } from '#/lib/format'
import { pdfFileName } from '#/pdf/file-name'

// 27/10/2026 08:00 in Vietnam (UTC+7); 23:30 UTC the day before is already the 27th there.
const DATE = new Date('2026-10-27T01:00:00Z')

describe('formatFileDate', () => {
  it('uses dashes and Vietnam time', () => {
    expect(formatFileDate(DATE)).toBe('27-10-2026')
    expect(formatFileDate(new Date('2026-10-26T23:30:00Z'))).toBe('27-10-2026')
  })
})

describe('pdfFileName', () => {
  it('keeps the name and its diacritics', () => {
    expect(pdfFileName('CÔNG TRÌNH MẪU 1 – KHÁCH SẠN 9 TẦNG', DATE)).toBe(
      'BV - CÔNG TRÌNH MẪU 1 – KHÁCH SẠN 9 TẦNG - 27-10-2026.pdf',
    )
  })

  it('replaces reserved characters and collapses spaces', () => {
    expect(pdfFileName('NHÀ A/B: "LÔ 3" * <x>|y?\\z', DATE)).toBe(
      'BV - NHÀ A B LÔ 3 x y z - 27-10-2026.pdf',
    )
    expect(pdfFileName('  NHÀ\tA\n\nB  ', DATE)).toBe(
      'BV - NHÀ A B - 27-10-2026.pdf',
    )
  })

  it('drops trailing dots and falls back when empty', () => {
    expect(pdfFileName('NHÀ ÔNG A...', DATE)).toBe(
      'BV - NHÀ ÔNG A - 27-10-2026.pdf',
    )
    expect(pdfFileName(' / ', DATE)).toBe('BV - Chưa đặt tên - 27-10-2026.pdf')
  })

  it('caps very long names', () => {
    const name = pdfFileName('A'.repeat(300), DATE)
    expect(name).toBe(`BV - ${'A'.repeat(120)} - 27-10-2026.pdf`)
  })
})
