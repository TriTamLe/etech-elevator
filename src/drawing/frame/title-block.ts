import { COMPANY } from '#/config/company'
import { DOC_TYPES } from '#/domain/config'
import type { Derived, Page } from '#/domain/derive'
import type { ElevatorParams } from '#/domain/schema'
import { TITLE } from '#/drawing/frame/layout'
import {
  fittedText,
  hline,
  imageContain,
  rect,
  text,
  vline,
} from '#/drawing/prims'
import { ellipsize, fits, wrap } from '#/drawing/text-metrics'
import type { Prim } from '#/drawing/types'

/** The 6 document-type rows, bilingual, in DOC_TYPES order (as printed). */
const ISSUED_ROWS: Record<(typeof DOC_TYPES)[number], [string, string]> = {
  reference: ['THAM KHẢO', 'REFERENCE'],
  'basic-design': ['THIẾT KẾ CƠ SỞ', 'PRELIMINARY'],
  approval: ['TRÌNH DUYỆT', 'YOUR APPROVAL'],
  construction: ['THI CÔNG', 'CONSTRUCTION'],
  revision: ['HIỆU CHỈNH', 'REVISED'],
  'as-built': ['HOÀN CÔNG', 'AS-BUILD'],
}

/** "Hạng mục" in the title block is the trade, not the cover's long category line. */
export const TITLE_BLOCK_PART = 'THANG MÁY'

/** Completion date and revision number for one sheet: per-page override, else the project's. */
export function pageStamp(
  p: ElevatorParams,
  page: Page,
): { completedDate: string; revisionNo: string } {
  const o = p.project.pageOverrides[page.key]
  return {
    completedDate: o?.completedDate?.trim() || p.project.completedDate,
    revisionNo: o?.revisionNo?.trim() || p.project.revisionNo,
  }
}

/** "DTP 01" → ["DTP", "01"] for the two halves of the sheet-code circle. */
function splitCode(code: string): [string, string] {
  const i = code.lastIndexOf(' ')
  return i < 0 ? [code, ''] : [code.slice(0, i), code.slice(i + 1)]
}

export function titleBlock(
  p: ElevatorParams,
  d: Derived,
  page: Page,
): Array<Prim> {
  const T = TITLE
  const { left, right } = T
  const width = right - left
  const maxW = width - 2 * T.pad
  const out: Array<Prim> = []

  // Rules: the left edge, then every horizontal band boundary.
  out.push(vline(left, T.issued.top, T.code.bottom))
  for (const y of [
    T.issued.bottom,
    ...T.issued.rows.slice(1),
    T.approval.bottom,
    T.stamp.bottom,
    T.company.bottom,
    ...T.signers.rows,
    T.project.bottom,
    T.part.bottom,
    T.drawing.bottom,
  ])
    out.push(hline(y, left, right))

  // LOẠI HỒ SƠ (ISSUED FOR) + 6 ticked/unticked rows.
  out.push(
    text(T.center, T.issued.headBaseline, 'LOẠI HỒ SƠ', T.large, {
      anchor: 'middle',
      bold: true,
      italic: true,
    }),
    text(T.center, T.issued.subBaseline, '(ISSUED FOR)', T.large, {
      anchor: 'middle',
      italic: true,
    }),
  )
  DOC_TYPES.forEach((type, i) => {
    const top = T.issued.rows[i]
    const baseline = T.issued.rows[i + 1] - T.issued.baselineUp
    const [vi, en] = ISSUED_ROWS[type]
    const { box } = T.issued
    out.push(
      text(T.issued.labelX, baseline, vi, T.small),
      rect(
        { x: box.x, y: top + box.inset, w: box.size, h: box.size },
        { fill: p.project.docType === type ? 'ink' : 'none' },
      ),
      text(T.issued.englishX, baseline, en, T.small),
    )
  })

  // THỎA THUẬN CỦA CHỦ ĐẦU TƯ (box below stays empty for the investor's stamp).
  out.push(
    text(
      T.center,
      T.approval.headBaseline,
      'THỎA THUẬN CỦA CHỦ ĐẦU TƯ',
      T.large,
      {
        anchor: 'middle',
        bold: true,
        italic: true,
      },
    ),
    text(T.center, T.approval.subBaseline, '(APPROVAL OF INVESTOR)', T.large, {
      anchor: 'middle',
      italic: true,
    }),
  )

  // Company: logo + address lines + phone.
  const { logo } = COMPANY
  out.push(imageContain(logo.href, logo.width / logo.height, T.company.logo))
  const companyLines = [
    ...wrap(COMPANY.address, T.company.textW, T.medium, 3),
    COMPANY.phone,
  ]
  companyLines.forEach((line, i) => {
    out.push(
      ...fittedText(
        T.company.textX,
        T.company.firstBaseline + i * T.company.lineStep,
        line,
        T.company.textW,
        T.medium,
        T.minSize,
      ),
    )
  })

  // DUYỆT / KIỂM TRA / THIẾT KẾ.
  const [nameX1, nameX2] = T.signers.cols
  out.push(
    vline(nameX1, T.signers.rows[0], T.signers.rows[T.signers.rows.length - 1]),
    vline(nameX2, T.signers.rows[0], T.signers.rows[T.signers.rows.length - 1]),
  )
  const signers: Array<[string, string]> = [
    ['DUYỆT', p.project.approver],
    ['KIỂM TRA', p.project.checker],
    ['THIẾT KẾ', p.project.designer],
  ]
  signers.forEach(([label, name], i) => {
    const baseline = T.signers.rows[i] + T.signers.baselineDown
    out.push(
      text(T.signers.labelX, baseline, label, T.small),
      ...fittedText(
        (nameX1 + nameX2) / 2,
        baseline,
        name.toUpperCase(),
        nameX2 - nameX1 - 2 * T.pad,
        T.small,
        T.minSize,
        { anchor: 'middle' },
      ),
    )
  })

  // Project name + title-block address (flows after its label, wraps to the left edge).
  const textX = left + T.pad
  out.push(
    text(
      textX,
      T.project.labelBaseline,
      'Tên công trình/ Project name:',
      T.small,
    ),
    ...fittedText(
      T.center,
      T.project.nameBaseline,
      p.project.name,
      maxW,
      T.value,
      T.minSize,
      {
        anchor: 'middle',
        bold: true,
        italic: true,
      },
    ),
    text(textX, T.project.addressLabelBaseline, 'Địa chỉ/ Address:', T.small),
  )
  out.push(...addressLines(d.titleBlockAddress))

  // Hạng mục / Part.
  out.push(
    text(textX, T.part.labelBaseline, 'Hạng mục/ Part:', T.large),
    text(T.center, T.part.valueBaseline, TITLE_BLOCK_PART, T.value, {
      anchor: 'middle',
      italic: true,
    }),
  )

  // Tên bản vẽ / Drawing title.
  out.push(
    text(
      textX,
      T.drawing.labelBaseline,
      'Tên bản vẽ/ Drawing title:',
      T.medium,
    ),
    ...fittedText(
      T.center,
      T.drawing.valueBaseline,
      page.title.toUpperCase(),
      maxW,
      T.large,
      T.minSize,
      { anchor: 'middle', bold: true, italic: true },
    ),
  )

  // Sheet code circle, revision number, completion date.
  const { code } = T
  const [prefix, number] = splitCode(page.code)
  const stamp = pageStamp(p, page)
  const valueW = right - code.valueX - T.pad
  out.push(
    vline(code.split.x, T.drawing.bottom, code.bottom),
    hline(code.split.y, code.split.x, right),
    text(textX, code.labelBaseline, 'Ký hiệu bản vẽ:', T.medium),
    {
      kind: 'circle',
      c: { x: code.circle.x, y: code.circle.y },
      r: code.circle.r,
    },
    hline(
      code.circle.y,
      code.circle.x - code.circle.r,
      code.circle.x + code.circle.r,
    ),
    text(code.circle.x, code.prefixBaseline, prefix, code.prefixSize, {
      anchor: 'middle',
      bold: true,
    }),
    text(code.circle.x, code.numberBaseline, number, code.numberSize, {
      anchor: 'middle',
      bold: true,
    }),
    text(
      code.rightX,
      code.revisionLabelBaseline,
      'Hiệu chỉnh/ Revision no:',
      T.small,
    ),
    ...fittedText(
      code.valueX,
      code.revisionBaseline,
      stamp.revisionNo,
      valueW,
      T.small,
      T.minSize,
    ),
    text(
      code.rightX,
      code.dateLabelBaseline,
      'Ngày hoàn thành/ Date:',
      T.small,
    ),
    ...fittedText(
      code.valueX,
      code.dateBaseline,
      stamp.completedDate,
      valueW,
      T.small,
      T.minSize,
    ),
  )
  return out
}

/**
 * The address starts after "Địa chỉ/ Address:" and continues on a second line from the
 * left edge; it shrinks (then ellipsizes) to stay inside those two lines.
 */
function addressLines(address: string): Array<Prim> {
  const T = TITLE
  const v = address.trim()
  if (!v) return []
  const { project: P } = T
  const firstW = T.right - T.pad - P.addressX
  const restW = T.right - T.pad - P.addressWrapX
  const words = v.split(/\s+/)
  const at = (s: number) => {
    // Greedy: words onto the short first line, the rest onto the full-width second line.
    let k = 0
    let first = ''
    while (k < words.length) {
      const next = first ? `${first} ${words[k]}` : words[k]
      if (!fits(next, firstW, s)) break
      first = next
      k++
    }
    const second = words.slice(k).join(' ')
    return { first, second, fits: fits(second, restW, s) }
  }
  let s = T.value
  let lines = at(s)
  while (!lines.fits && s - 0.1 >= T.minSize) {
    s -= 0.1
    lines = at(s)
  }
  const out: Array<Prim> = []
  if (lines.first) out.push(text(P.addressX, P.addressBaseline, lines.first, s))
  if (lines.second)
    out.push(
      text(
        P.addressWrapX,
        P.addressBaseline + P.addressLineStep,
        ellipsize(lines.second, restW, s),
        s,
      ),
    )
  return out
}
