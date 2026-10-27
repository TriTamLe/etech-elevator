import { formatFileDate } from '#/lib/format'

/** Keeps Windows/macOS happy: no reserved characters, no control characters. */
const RESERVED = /[\\/:*?"<>|\p{Cc}]/gu
/** Long Vietnamese project names stay readable without hitting path-length limits. */
const MAX_NAME = 120

/**
 * "BV - CÔNG TRÌNH MẪU 1 – KHÁCH SẠN 9 TẦNG - 27-10-2026.pdf". Diacritics are kept (the
 * name is for people); reserved characters become spaces and runs of spaces collapse.
 */
export function pdfFileName(projectName: string, date: Date): string {
  const name =
    projectName
      .replace(RESERVED, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_NAME)
      // Windows drops trailing dots and spaces from file names.
      .replace(/[.\s]+$/, '') || 'Chưa đặt tên'
  return `BV - ${name} - ${formatFileDate(date)}.pdf`
}
