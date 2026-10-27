// Dates render on the Worker (UTC) and in the browser; pin the zone so SSR and
// hydration print the same text. The app is used in Vietnam only.
export const APP_TIME_ZONE = 'Asia/Ho_Chi_Minh'

const parts = new Intl.DateTimeFormat('en-GB', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function pick(date: Date) {
  const p = Object.fromEntries(
    parts.formatToParts(date).map((x) => [x.type, x.value]),
  )
  return p as Record<'year' | 'month' | 'day' | 'hour' | 'minute', string>
}

/** "14:32" in Vietnam time. */
export function formatTime(date: Date): string {
  const p = pick(date)
  return `${p.hour}:${p.minute}`
}

/** "14:32 · 22/10", or "14:32 · 22/10/2025" when not in the same year as `now`. */
export function formatUpdatedAt(date: Date, now: Date): string {
  const p = pick(date)
  const day =
    p.year === pick(now).year
      ? `${p.day}/${p.month}`
      : `${p.day}/${p.month}/${p.year}`
  return `${p.hour}:${p.minute} · ${day}`
}

/** "22/10/2026" in Vietnam time (title-block and revision dates). */
export function formatDate(date: Date): string {
  const p = pick(date)
  return `${p.day}/${p.month}/${p.year}`
}

/** "20900" → "20.900" (Vietnamese thousands separator), for lengths printed on sheets. */
export function formatMm(mm: number): string {
  return String(Math.round(mm)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
