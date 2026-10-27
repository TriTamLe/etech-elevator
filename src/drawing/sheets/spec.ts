import { LIFT_TYPE_PRINT, PAGE_TITLES } from '#/domain/config'
import type { Derived } from '#/domain/derive'
import type { ElevatorParams } from '#/domain/schema'
import { SPEC } from '#/drawing/frame/layout'
import { fittedText, hline, rect, text, vline } from '#/drawing/prims'
import {
  ascent,
  descent,
  fitSize,
  fits,
  measure,
  wrap,
} from '#/drawing/text-metrics'
import type { Prim } from '#/drawing/types'
import { formatMm } from '#/lib/format'

export type SpecRow = { label: string; value: string }

/** The 11 single rows of the DTP 02 table, values formatted as on the reference sheets. */
export function specRows(p: ElevatorParams, d: Derived): Array<SpecRow> {
  const t = p.tech
  const total = d.shaftTotalHeight
  return [
    { label: 'LOẠI THANG', value: LIFT_TYPE_PRINT[t.liftType] },
    { label: 'MÃ HIỆU THANG', value: t.modelCode },
    { label: 'TẢI TRỌNG', value: `${t.loadKg} Kg` },
    {
      label: 'KÍCH THƯỚC HỐ THANG',
      value: `W ${t.shaft.width} (Rộng) x D ${t.shaft.depth} (Sâu)`,
    },
    {
      label: 'KÍCH THƯỚC CABIN',
      value: `W ${t.car.width} (Rộng) x D ${t.car.depth} (Sâu) x H ${t.car.height} (Cao)`,
    },
    {
      label: 'KÍCH THƯỚC CỬA',
      value: `W ${t.door.width} x H ${t.door.height}`,
    },
    {
      label: 'SỐ ĐIỂM DỪNG',
      value: `${String(t.stops).padStart(2, '0')} Stops`,
    },
    { label: 'TỐC ĐỘ', value: `${t.speed} m/phút` },
    {
      label: 'MÁY KÉO - TỦ ĐIỀU KHIỂN',
      value: [t.machine.trim(), t.controller.trim()].filter(Boolean).join(' '),
    },
    {
      label: 'TỔNG CHIỀU CAO HỐ',
      value: total === null ? '-- mm' : `${formatMm(total)} mm`,
    },
    {
      label: 'PIT/OH',
      value: `${t.pit} / ${t.overhead + t.topRoomHeight} (${t.overhead} + ${t.topRoomHeight})`,
    },
  ]
}

/** The power row splits into two sub-rows. */
export function powerRows(p: ElevatorParams): Array<SpecRow> {
  return [
    { label: 'CHÍNH', value: p.tech.mainPower },
    { label: 'ĐÈN', value: p.tech.lightPower },
  ]
}

/**
 * A value starts at the value column's usual x; one too wide for that slides left (as on
 * the reference sheet), then shrinks to fit the whole cell. Below `wrapSize` it goes onto
 * two lines centred in the row instead, shrinking to `minSize` and ellipsizing last.
 */
function value(v: string, rowTop: number): Array<Prim> {
  const S = SPEC
  const cellLeft = S.split + S.pad
  const cellRight = S.right - S.pad
  const cellW = cellRight - cellLeft
  const baseline = rowTop + S.baselineDown
  const w = measure(v, S.size)
  const x = Math.max(cellLeft, Math.min(S.valueX, cellRight - w))
  if (fits(v, cellRight - x, S.wrapSize))
    return fittedText(x, baseline, v, cellRight - x, S.size, S.wrapSize)
  let s: number = S.wrapSize
  let lines = wrap(v, cellW, s, Number.POSITIVE_INFINITY)
  while (lines.length > 2 && s > S.minSize) {
    s = Math.max(S.minSize, s - 0.25)
    lines = wrap(v, cellW, s, Number.POSITIVE_INFINITY)
  }
  if (lines.length > 2) lines = wrap(v, cellW, s, 2)
  // One unbreakable word: a single line shrunk across the whole cell.
  if (lines.length === 1)
    return fittedText(cellLeft, baseline, v, cellW, S.wrapSize, S.minSize)
  // Two lines at pitch `lineGap·s`, their pair centred on the row.
  const pitch = S.lineGap * s
  const first =
    rowTop + S.rowHeight / 2 - pitch / 2 + ascent(s) / 2 - descent(s) / 2
  return lines.map((l, i) => text(cellLeft, first + i * pitch, l, s))
}

/** DTP 02 — Đặc tính kỹ thuật: titled 2-column table, 11 rows + a 2-line power row. */
export function specSheet(p: ElevatorParams, d: Derived): Array<Prim> {
  const S = SPEC
  const rows = specRows(p, d)
  const power = powerRows(p)
  const rowTop = (i: number) => S.titleBottom + i * S.rowHeight
  const bottom = rowTop(rows.length + power.length)
  const out: Array<Prim> = []

  // Outline, title box, row rules, column rules.
  out.push(
    hline(S.top, S.left, S.right),
    vline(S.left, S.top, bottom),
    vline(S.right, S.top, bottom),
    rect(
      { x: S.title.x, y: S.title.y, w: S.title.w, h: S.title.h },
      { r: S.title.r },
    ),
    text(
      (S.left + S.right) / 2,
      S.title.baseline,
      PAGE_TITLES.spec.toUpperCase(),
      S.title.size,
      { anchor: 'middle' },
    ),
  )
  for (let i = 0; i <= rows.length + power.length; i++) {
    // The rule between the two power sub-rows stops at the "NGUỒN ĐIỆN" cell.
    const left = i === rows.length + 1 ? S.power.labelSplit : S.left
    out.push(hline(rowTop(i), left, S.right))
  }
  out.push(
    vline(S.split, S.titleBottom, bottom),
    vline(S.power.labelSplit, rowTop(rows.length), bottom),
  )

  const labelW = S.split - S.pad - S.labelX
  rows.forEach((row, i) => {
    const baseline = rowTop(i) + S.baselineDown
    out.push(
      ...fittedText(S.labelX, baseline, row.label, labelW, S.size, S.minSize),
      ...value(row.value, rowTop(i)),
    )
  })

  // NGUỒN ĐIỆN, centred over both sub-rows, then CHÍNH / ĐÈN.
  const powerTop = rowTop(rows.length)
  const powerLabelW = S.power.labelSplit - S.left - 2 * S.pad
  out.push(
    text(
      (S.left + S.power.labelSplit) / 2,
      powerTop + S.rowHeight + S.power.labelBelowSplit,
      'NGUỒN ĐIỆN',
      fitSize('NGUỒN ĐIỆN', powerLabelW, S.power.labelSize, S.minSize),
      { anchor: 'middle' },
    ),
  )
  power.forEach((row, i) => {
    const baseline = powerTop + i * S.rowHeight + S.baselineDown
    out.push(
      text(S.power.subX, baseline, row.label, S.size),
      ...value(row.value, powerTop + i * S.rowHeight),
    )
  })
  return out
}
