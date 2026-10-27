import {
  JAMB,
  JAMB_TYPES,
  LIFT_TYPE_LABELS,
  PAGE_CODE_PREFIX,
  PAGE_TITLES,
  TITLE_BLOCK_PART_DEFAULT,
} from '#/domain/config'
import type { PAGE_KEYS } from '#/domain/config'
import type { ElevatorParams, Floor, JambType } from '#/domain/schema'

// Pure derived values (mm). No React, DOM, Date.now or randomness — sheets and the form read these.

export type PageKey = (typeof PAGE_KEYS)[number]

/**
 * PIT + Σ heights of floors 1…N−1 + OH + top room (the top floor has no own height:
 * its row is OH + top room). null while any of floors 1…N−1 has no height.
 */
export function shaftTotalHeight(p: ElevatorParams): number | null {
  let sum = 0
  for (const floor of p.floors.slice(0, -1)) {
    if (floor.height === null) return null
    sum += floor.height
  }
  return p.tech.pit + sum + p.tech.overhead + p.tech.topRoomHeight
}

/** Landing rough opening for a jamb type, plus the wall left on each side. */
export function landingOpening(
  p: ElevatorParams,
  jamb: JambType,
): { width: number; side: number } {
  const width =
    jamb === 'wide' ? JAMB.wideOpening : p.tech.door.width + JAMB.narrowExtra
  return { width, side: (p.tech.shaft.width - width) / 2 }
}

/** Hook position from the left / front wall: manual value, else the shaft centre. */
export function hookPosition(p: ElevatorParams): { x: number; y: number } {
  return {
    x: p.topRoom.hook.x ?? p.tech.shaft.width / 2,
    y: p.topRoom.hook.y ?? p.tech.shaft.depth / 2,
  }
}

export type FloorGroup = {
  /** Drawing label, e.g. "1F", "2F~3F", "5F(OH)". */
  label: string
  /** Indices into `floors`, bottom to top. */
  indices: Array<number>
  /** Several floors collapsed into one: draw a break line. */
  collapsed: boolean
  isTop: boolean
}

function rangeLabel(floors: Array<Floor>, indices: Array<number>, sep = '~') {
  const first = floors[indices[0]].name
  const last = floors[indices[indices.length - 1]].name
  return indices.length === 1 ? first : `${first}${sep}${last}`
}

/**
 * Floors on the vertical section, bottom to top (decision #6, set 2):
 * N ≤ 4 → every floor; otherwise 1F · 2F~(N−2) · N−1 · N(OH).
 */
export function floorGroups(floors: Array<Floor>): Array<FloorGroup> {
  const n = floors.length
  const parts: Array<Array<number>> =
    n <= 4
      ? floors.map((_, i) => [i])
      : [[0], Array.from({ length: n - 3 }, (_, i) => i + 1), [n - 2], [n - 1]]
  return parts.map((indices) => {
    const isTop = indices[0] === n - 1
    const label = rangeLabel(floors, indices)
    return {
      label: isTop ? `${label}(OH)` : label,
      indices,
      collapsed: indices.length > 1,
      isTop,
    }
  })
}

export type HeightRow = { label: string; value: number | null }

/**
 * Floor-height table rows, top to bottom, ending with PIT (decision #14):
 * grouped like the drawing; a group whose floors differ in height is split per floor.
 * `value` null = not entered (the sheet prints "…….").
 */
export function heightTableRows(p: ElevatorParams): Array<HeightRow> {
  const rows: Array<HeightRow> = []
  for (const group of floorGroups(p.floors).reverse()) {
    if (group.isTop) {
      rows.push({
        label: p.floors[group.indices[0]].name,
        value: p.tech.overhead + p.tech.topRoomHeight,
      })
      continue
    }
    const heights = group.indices.map((i) => p.floors[i].height)
    if (heights.every((h) => h === heights[0])) {
      rows.push({
        label: rangeLabel(p.floors, group.indices, '-'),
        value: heights[0],
      })
    } else {
      for (const i of [...group.indices].reverse()) {
        rows.push({ label: p.floors[i].name, value: p.floors[i].height })
      }
    }
  }
  rows.push({ label: 'PIT', value: p.tech.pit })
  return rows
}

/** Jamb types used by floors that have a landing door, in fixed order (wide, narrow). */
export function jambsInUse(floors: Array<Floor>): Array<JambType> {
  return JAMB_TYPES.filter((j) => floors.some((f) => f.hasDoor && f.jamb === j))
}

/** "Tầng 2F ~ 5F" for the floors using a jamb type; non-contiguous runs joined by ", ". */
export function jambFloorsLabel(floors: Array<Floor>, jamb: JambType): string {
  const runs: Array<Array<number>> = []
  floors.forEach((f, i) => {
    if (!f.hasDoor || f.jamb !== jamb) return
    const run = runs.at(-1)
    if (run && run[run.length - 1] === i - 1) run.push(i)
    else runs.push([i])
  })
  if (runs.length === 0) return ''
  return `Tầng ${runs.map((r) => rangeLabel(floors, r, ' ~ ')).join(', ')}`
}

export type Page = {
  key: PageKey
  /** "" for the cover, else "DTP 01"… numbered without gaps. */
  code: string
  title: string
}

/** Sheets in the fixed export order; one landing sheet per jamb type in use. */
export function pageList(p: ElevatorParams): Array<Page> {
  const used = jambsInUse(p.floors)
  const keys: Array<PageKey> = [
    'cover',
    'responsibility',
    'spec',
    'plan',
    'pit',
    'section',
    ...used.map((j): PageKey => `landing-${j}`),
    'machine-room',
  ]
  return keys.map((key, i) => ({
    key,
    code:
      key === 'cover'
        ? ''
        : `${PAGE_CODE_PREFIX} ${String(i).padStart(2, '0')}`,
    title: PAGE_TITLES[key],
  }))
}

/** Cover "hạng mục" suggestion, e.g. "THANG TẢI KHÁCH - TẢI TRỌNG 750 KG - SỐ LƯỢNG : 1 THANG". */
export function suggestedCategory(p: ElevatorParams): string {
  return `THANG TẢI KHÁCH - TẢI TRỌNG ${p.tech.loadKg} KG - SỐ LƯỢNG : ${p.project.quantity} THANG`
}

export function effectiveCategory(p: ElevatorParams): string {
  return p.project.category.trim() || suggestedCategory(p)
}

/** Title-block "hạng mục": the field when filled in, else "THANG MÁY". */
export function titleBlockPart(p: ElevatorParams): string {
  return p.project.titleBlockPart.trim() || TITLE_BLOCK_PART_DEFAULT
}

/** Title-block address: the short one when filled in, else the full address. */
export function titleBlockAddress(p: ElevatorParams): string {
  return p.project.shortAddress.trim() || p.project.address
}

export function liftTypeLabel(p: ElevatorParams): string {
  return LIFT_TYPE_LABELS[p.tech.liftType]
}

export type Derived = ReturnType<typeof derive>

/** Everything the sheets need, computed once per params change. */
export function derive(p: ElevatorParams) {
  const jambs = jambsInUse(p.floors)
  return {
    shaftTotalHeight: shaftTotalHeight(p),
    openings: Object.fromEntries(
      jambs.map((j) => [j, landingOpening(p, j)]),
    ) as Partial<Record<JambType, { width: number; side: number }>>,
    jambFloors: Object.fromEntries(
      jambs.map((j) => [j, jambFloorsLabel(p.floors, j)]),
    ) as Partial<Record<JambType, string>>,
    hook: hookPosition(p),
    floorGroups: floorGroups(p.floors),
    heightRows: heightTableRows(p),
    pages: pageList(p),
    category: effectiveCategory(p),
    titleBlockAddress: titleBlockAddress(p),
    titleBlockPart: titleBlockPart(p),
    liftTypeLabel: liftTypeLabel(p),
  }
}
