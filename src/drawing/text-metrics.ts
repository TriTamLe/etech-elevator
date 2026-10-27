import {
  ADVANCE,
  ASCENT,
  DESCENT,
  UNITS_PER_EM,
} from '#/drawing/fonts/tinos-metrics'

// Text measurement from a precomputed Tinos width table: pure, so it runs the same in the
// browser, in tests and while exporting the PDF (no canvas, no DOM).

export type FontStyle = { bold?: boolean; italic?: boolean }

function table(style: FontStyle): Record<number, number> {
  if (style.bold) return style.italic ? ADVANCE.boldItalic : ADVANCE.bold
  return style.italic ? ADVANCE.italic : ADVANCE.regular
}

const isCombining = (cp: number) => cp >= 0x300 && cp <= 0x36f

/** Width in mm of `text` set at font size `size` (mm). Kerning is ignored. */
export function measure(
  text: string,
  size: number,
  style: FontStyle = {},
): number {
  const t = table(style)
  // Glyphs missing from the table (rare symbols) count as an "n".
  const fallback = t[0x6e]
  let units = 0
  for (const ch of text.normalize('NFC')) {
    const cp = ch.codePointAt(0) ?? 0
    units += t[cp] ?? (isCombining(cp) ? 0 : fallback)
  }
  return (units / UNITS_PER_EM) * size
}

/**
 * Width tolerance (mm) for "does it fit": float rounding makes a string shrunk to exactly
 * `maxW` measure a hair wider, which must not count as overflowing.
 */
export const FIT_EPS = 1e-6

/** True when `text` at `size` is no wider than `maxW` (within FIT_EPS). */
export function fits(
  text: string,
  maxW: number,
  size: number,
  style: FontStyle = {},
): boolean {
  return measure(text, size, style) <= maxW + FIT_EPS
}

/** Distance from the baseline to the top / bottom of the line box, in mm. */
export function ascent(size: number): number {
  return (ASCENT / UNITS_PER_EM) * size
}
export function descent(size: number): number {
  return (-DESCENT / UNITS_PER_EM) * size
}

/** Largest size ≤ `size` (not below `minSize`) at which `text` fits in `maxW`. */
export function fitSize(
  text: string,
  maxW: number,
  size: number,
  minSize: number,
  style: FontStyle = {},
): number {
  const w = measure(text, size, style)
  if (w <= maxW + FIT_EPS || w === 0) return size
  return Math.max(minSize, size * (maxW / w))
}

/** `text` cut at a word or character boundary and ended with "…" so it fits in `maxW`. */
export function ellipsize(
  text: string,
  maxW: number,
  size: number,
  style: FontStyle = {},
): string {
  const chars = Array.from(text.normalize('NFC'))
  if (fits(text, maxW, size, style)) return chars.join('')
  let lo = 0
  let hi = chars.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (fits(chars.slice(0, mid).join('').trimEnd() + '…', maxW, size, style))
      lo = mid
    else hi = mid - 1
  }
  return lo === 0 ? '' : chars.slice(0, lo).join('').trimEnd() + '…'
}

/** Greedy word wrap into at most `maxLines` lines; the last line is ellipsized if needed. */
export function wrap(
  text: string,
  maxW: number,
  size: number,
  maxLines: number,
  style: FontStyle = {},
): Array<string> {
  const words = text.normalize('NFC').split(/\s+/).filter(Boolean)
  const lines: Array<string> = []
  let i = 0
  while (i < words.length && lines.length < maxLines) {
    if (lines.length === maxLines - 1) {
      lines.push(ellipsize(words.slice(i).join(' '), maxW, size, style))
      break
    }
    let line = words[i]
    i++
    while (i < words.length && fits(`${line} ${words[i]}`, maxW, size, style)) {
      line = `${line} ${words[i]}`
      i++
    }
    lines.push(
      fits(line, maxW, size, style) ? line : ellipsize(line, maxW, size, style),
    )
  }
  return lines
}
