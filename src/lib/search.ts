/** Lower-case, strip Vietnamese diacritics (đ → d, NFD marks) so "da nang" finds "Đà Nẵng". */
export function foldVi(s: string): string {
  return s
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

/** True when every word of `query` appears in one of `fields` (diacritic-insensitive). */
export function matchesQuery(
  fields: ReadonlyArray<string>,
  query: string,
): boolean {
  const words = foldVi(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const haystack = fields.map(foldVi).join(' ')
  return words.every((w) => haystack.includes(w))
}
