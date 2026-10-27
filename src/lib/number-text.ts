import { formatDecimal } from '#/lib/format'

// What a number field's text means, Vietnamese style: "." groups thousands ("1.500" =
// 1500) and "," starts the decimal part ("2,5"). Decimal fields also take "2.5": a
// single dot that cannot be a thousands separator can only be a decimal point.

/**
 * "1500" or dot-grouped thousands: "1.500", "20.900", "1.234.567". A group can't start
 * with 0, so "0.500" is never 500 (a decimal field reads it as 0,5).
 */
const INTEGER = /^(\d+|[1-9]\d{0,2}(\.\d{3})+)$/
const WITH_COMMA = /^(\d+|[1-9]\d{0,2}(\.\d{3})+),\d+$/
const DOT_DECIMAL = /^\d+\.\d+$/

/** The number in a field's text, or NaN when it is not one (Zod then says "Nhập một số."). */
export function parseNumberText(text: string, decimal: boolean): number {
  const t = text.trim()
  if (INTEGER.test(t)) return Number(t.replaceAll('.', ''))
  if (!decimal) return Number.NaN
  if (WITH_COMMA.test(t)) return Number(t.replaceAll('.', '').replace(',', '.'))
  if (DOT_DECIMAL.test(t)) return Number(t)
  return Number.NaN
}

/** A field's text for a stored value: no thousands dots, decimal comma ("2,5"). */
export function formatNumberText(
  value: number | null,
  decimal: boolean,
): string {
  if (value === null || Number.isNaN(value)) return ''
  return decimal ? formatDecimal(value) : String(value)
}
