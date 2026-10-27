import { BORDER } from '#/drawing/frame/layout'
import { rect } from '#/drawing/prims'
import type { Prim } from '#/drawing/types'

/** Plot boundary + drawing border, shared by the cover and every framed sheet. */
export function border(): Array<Prim> {
  return [
    rect(BORDER.outer, { weight: 'medium' }),
    rect(BORDER.inner, { weight: 'medium' }),
  ]
}
