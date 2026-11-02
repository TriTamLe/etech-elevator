import { describe, expect, it } from 'vitest'

import * as P from '#/drawing/primitives'
import { arrowHead } from '#/drawing/primitives/arrow-head'
import { BREAK_GAP, breakLine } from '#/drawing/primitives/break-line'
import { dim, dimChain, dimStyle } from '#/drawing/primitives/dimension'
import { DOOR_ARROW, doorArrow } from '#/drawing/primitives/door-arrow'
import { FIT_SCALES, fitScale } from '#/drawing/primitives/fit-scale'
import {
  MAX_HATCH_SEGS,
  MIN_HATCH_GAP,
  hatch,
} from '#/drawing/primitives/hatch'
import {
  HATCH_NAMES,
  HATCH_PATTERNS,
} from '#/drawing/primitives/hatch-patterns'
import { LEADER_LINE_GAP, leader } from '#/drawing/primitives/leader'
import { SECTION_MARK, sectionMark } from '#/drawing/primitives/section-mark'
import { table } from '#/drawing/primitives/table'
import { len, toSheet, view } from '#/drawing/primitives/view'

describe('primitives/index: các export gộp trỏ đúng hàm gốc', () => {
  it('view, fit-scale', () => {
    expect(P.view).toBe(view)
    expect(P.toSheet).toBe(toSheet)
    expect(P.len).toBe(len)
    expect(P.fitScale).toBe(fitScale)
    expect(P.FIT_SCALES).toBe(FIT_SCALES)
  })

  it('kích thước', () => {
    expect(P.dim).toBe(dim)
    expect(P.dimChain).toBe(dimChain)
    expect(P.dimStyle).toBe(dimStyle)
    expect(P.arrowHead).toBe(arrowHead)
    expect(typeof P.plainLabel).toBe('function')
    expect(typeof P.prefixLabel).toBe('function')
    expect(P.DIM_RATIO.arrow).toBe(0.34)
  })

  it('hatch', () => {
    expect(P.hatch).toBe(hatch)
    expect(P.MAX_HATCH_SEGS).toBe(MAX_HATCH_SEGS)
    expect(P.MIN_HATCH_GAP).toBe(MIN_HATCH_GAP)
    expect(P.HATCH_NAMES).toBe(HATCH_NAMES)
    expect(P.HATCH_PATTERNS).toBe(HATCH_PATTERNS)
  })

  it('ghi chú, ký hiệu, bảng', () => {
    expect(P.leader).toBe(leader)
    expect(P.LEADER_LINE_GAP).toBe(LEADER_LINE_GAP)
    expect(P.breakLine).toBe(breakLine)
    expect(P.BREAK_GAP).toBe(BREAK_GAP)
    expect(P.doorArrow).toBe(doorArrow)
    expect(P.DOOR_ARROW).toBe(DOOR_ARROW)
    expect(P.sectionMark).toBe(sectionMark)
    expect(P.SECTION_MARK).toBe(SECTION_MARK)
    expect(P.table).toBe(table)
  })
})
