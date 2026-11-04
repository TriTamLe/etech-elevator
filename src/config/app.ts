// App-wide UI copy that appears in more than one place (titles, offline notice).

export const APP_NAME = 'Công cụ tự động sinh báo cáo thiết kế thang máy'

/** Browser tab title: "<page> · <app>", or the app name alone. */
export function pageTitle(page?: string): string {
  return page ? `${page} · ${APP_NAME}` : APP_NAME
}

export const OFFLINE_TEXT = {
  banner: 'Mất mạng — sẽ tự lưu khi có mạng lại.',
  needsNetwork: 'Cần có mạng',
} as const
