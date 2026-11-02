import type { Derived, Page, PageKey } from '#/domain/derive'
import type { ElevatorParams } from '#/domain/schema'
import { framed } from '#/drawing/frame'
import { coverSheet } from '#/drawing/sheets/cover'
import { landingSheet } from '#/drawing/sheets/landing-door'
import { machineRoomSheet } from '#/drawing/sheets/machine-room'
import { pitSheet } from '#/drawing/sheets/pit'
import { planSheet } from '#/drawing/sheets/plan'
import { responsibilitySheet } from '#/drawing/sheets/responsibility'
import { sectionSheet } from '#/drawing/sheets/section'
import { specSheet } from '#/drawing/sheets/spec'
import type { Prim } from '#/drawing/types'

/**
 * Sheets whose drawing exists. The preview lists only these; the others would be an empty
 * frame (the section lands in P11). Add a key here when its sheet is done.
 */
export const READY_PAGES: ReadonlyArray<PageKey> = [
  'cover',
  'responsibility',
  'spec',
  'plan',
  'pit',
  'section',
  'landing-wide',
  'landing-narrow',
  'machine-room',
]

export function readyPages(pages: Array<Page>): Array<Page> {
  return pages.filter((page) => READY_PAGES.includes(page.key))
}

/** Primitives for one sheet of the set (not-ready sheets: frame with an empty drawing area). */
export function renderPage(
  p: ElevatorParams,
  d: Derived,
  page: Page,
): Array<Prim> {
  switch (page.key) {
    case 'cover':
      return coverSheet(p, d)
    case 'responsibility':
      return framed(p, d, page, responsibilitySheet(p))
    case 'spec':
      return framed(p, d, page, specSheet(p, d))
    case 'plan':
      return framed(p, d, page, planSheet(p, d))
    case 'pit':
      return framed(p, d, page, pitSheet(p, d))
    case 'section':
      return framed(p, d, page, sectionSheet(p, d))
    case 'landing-wide':
      return framed(p, d, page, landingSheet(p, d, 'wide'))
    case 'landing-narrow':
      return framed(p, d, page, landingSheet(p, d, 'narrow'))
    case 'machine-room':
      return framed(p, d, page, machineRoomSheet(p, d))
    default:
      return framed(p, d, page, [])
  }
}
