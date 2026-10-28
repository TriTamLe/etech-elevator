import { SYMBOL_DATA } from '#/drawing/symbols/data'
import type { SymbolData } from '#/drawing/symbols/types'

// The symbol library: geometry extracted from the reference DWG (`yarn gen:symbols`),
// placed on a sheet with placeSymbol() from ./place.

export type SymbolId = keyof typeof SYMBOL_DATA

export const SYMBOL_IDS = Object.keys(SYMBOL_DATA) as Array<SymbolId>

export function symbol(id: SymbolId): SymbolData {
  return SYMBOL_DATA[id]
}

export { placeSymbol, placedBox, stretchedBox } from '#/drawing/symbols/place'
export type { PlaceOpts } from '#/drawing/symbols/place'
export type { SymbolData } from '#/drawing/symbols/types'
