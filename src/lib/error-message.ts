import { isNotFound } from '@tanstack/react-router'

// One Vietnamese sentence for any error that reaches the UI. Our own errors are already
// Vietnamese; network failures, Zod validator payloads and English internals are mapped.
// Pure (it runs during render): failures are logged where they happen (Query caches,
// error boundaries), not here.

export const ERROR_TEXT = {
  notFound: 'Dự án không còn tồn tại.',
  network: 'Không kết nối được máy chủ — kiểm tra mạng rồi thử lại.',
  generic: 'Đã có lỗi, vui lòng thử lại.',
} as const

// Chrome "Failed to fetch", Firefox "NetworkError when attempting…", Safari "Load failed".
const NETWORK = /failed to fetch|networkerror|load failed|network request failed/i

// Latin letters with Vietnamese marks (À…ỹ covers đ/Đ and the Latin Extended Additional block).
const VIETNAMESE = /[À-ỹ]/

/** First message of a Zod issue array serialised into Error.message (server validators). */
function zodMessage(message: string): string | null {
  if (!message.startsWith('[')) return null
  try {
    const issues: unknown = JSON.parse(message)
    if (!Array.isArray(issues)) return null
    const first: unknown = issues[0]
    if (
      first &&
      typeof first === 'object' &&
      'message' in first &&
      typeof first.message === 'string'
    ) {
      return first.message
    }
  } catch {
    // not JSON: fall through
  }
  return null
}

export function errorMessage(
  error: unknown,
  // Workers and Node have a `navigator` without `onLine`: only an explicit false counts.
  online: boolean = typeof navigator === 'undefined' || navigator.onLine !== false,
): string {
  if (isNotFound(error)) return ERROR_TEXT.notFound
  const message = error instanceof Error ? error.message : ''
  if (!online || NETWORK.test(message)) return ERROR_TEXT.network
  const zod = zodMessage(message)
  if (zod) return VIETNAMESE.test(zod) ? zod : ERROR_TEXT.generic
  return VIETNAMESE.test(message) ? message : ERROR_TEXT.generic
}
