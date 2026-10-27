import { COMPANY } from '#/config/company'
import { PAGE_TITLES } from '#/domain/config'
import type { Derived } from '#/domain/derive'
import type { ElevatorParams } from '#/domain/schema'
import { border } from '#/drawing/frame/border'
import { COVER, SHEET_CENTER } from '#/drawing/frame/layout'
import { fittedText, imageContain, text, vline } from '#/drawing/prims'
import { ellipsize, fitSize, fits, wrap } from '#/drawing/text-metrics'
import type { Prim } from '#/drawing/types'

/** Cover footer, e.g. "ĐÀ NẴNG, 07/2026"; either part may be blank. */
export function coverFooter(p: ElevatorParams): string {
  return [
    p.project.issuePlace.trim().toUpperCase(),
    p.project.issueMonth.trim(),
  ]
    .filter(Boolean)
    .join(', ')
}

/**
 * One bilingual cover row ("Label/ English : value"). Shrinks to fit one line; if that
 * would go below COVER.wrapRatio of the normal size it wraps onto 2 lines instead (row
 * gaps leave room), shrinking down to COVER.minSize and ellipsizing as a last resort.
 */
function coverRow(label: string, value: string, baseline: number): Array<Prim> {
  const line = `${label} : ${value.trim()}`
  const { x, right } = COVER.rows
  const maxW = right - x
  const wrapAt = COVER.size * COVER.wrapRatio
  const single = fitSize(line, maxW, COVER.size, wrapAt)
  if (fits(line, maxW, single)) return [text(x, baseline, line, single)]
  let s = wrapAt
  let lines = wrap(line, maxW, s, Number.POSITIVE_INFINITY)
  while (lines.length > 2 && s > COVER.minSize) {
    s = Math.max(COVER.minSize, s - COVER.shrinkStep)
    lines = wrap(line, maxW, s, Number.POSITIVE_INFINITY)
  }
  const two =
    lines.length <= 2
      ? lines
      : [lines[0], ellipsize(lines.slice(1).join(' '), maxW, s)]
  return two.map((l, i) => text(x, baseline + i * s * COVER.lineGap, l, s))
}

export function coverSheet(p: ElevatorParams, d: Derived): Array<Prim> {
  const out: Array<Prim> = [...border()]
  const { logo } = COMPANY

  out.push(
    imageContain(logo.href, logo.width / logo.height, COVER.logo),
    vline(COVER.divider.x, COVER.divider.top, COVER.divider.bottom, 'thin'),
  )
  COMPANY.nameLines.forEach((line, i) => {
    out.push(
      text(COVER.nameCenter, COVER.nameBaselines[i], line, COVER.size, {
        anchor: 'middle',
      }),
    )
  })
  const address = wrap(COMPANY.address, COVER.addressW, COVER.size, 2)
  address.forEach((line, i) => {
    out.push(
      text(
        COVER.addressX,
        COVER.addressBaseline + i * COVER.addressLineStep,
        line,
        COVER.size,
      ),
    )
  })
  out.push(
    text(
      COVER.addressX,
      COVER.addressBaseline +
        (address.length - 1) * COVER.addressLineStep +
        COVER.phoneStep,
      COMPANY.phone,
      COVER.size,
    ),
  )

  out.push(
    text(
      SHEET_CENTER,
      COVER.title.baseline,
      PAGE_TITLES.cover.toUpperCase(),
      COVER.title.size,
      {
        anchor: 'middle',
      },
    ),
    ...coverRow(
      'Tên công trình/ Project name',
      p.project.name,
      COVER.rows.baselines[0],
    ),
    ...coverRow('Địa chỉ/ Address', p.project.address, COVER.rows.baselines[1]),
    ...coverRow('Hạng mục/ Part', d.category, COVER.rows.baselines[2]),
    ...fittedText(
      SHEET_CENTER,
      COVER.footerBaseline,
      coverFooter(p),
      COVER.rows.right - COVER.rows.x,
      COVER.size,
      COVER.minSize,
      { anchor: 'middle', italic: true },
    ),
  )
  return out
}
