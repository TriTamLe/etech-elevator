import { describe, expect, it } from 'vitest'
import { REVISION_TABLE_ROWS } from '#/domain/config'

import { checkRules, hasBlockingErrors } from '#/domain/rules'
import type { Issue } from '#/domain/rules'
import { presetParams } from '#/domain/presets'

const errorsAt = (issues: Array<Issue>, path: string) =>
  issues.filter((i) => i.level === 'error' && i.path === path)

describe('checkRules', () => {
  it.each(['hotel-9f', 'house-5f'] as const)('%s không có issue nào', (id) => {
    expect(checkRules(presetParams(id))).toEqual([])
  })

  it('CW + khe ray > AH là lỗi', () => {
    const p = presetParams('house-5f')
    p.tech.car.width = 1101 // 1101 + 400 > 1500
    const issues = checkRules(p)
    expect(errorsAt(issues, 'tech.car.width')).toHaveLength(1)
    expect(hasBlockingErrors(issues)).toBe(true)
  })

  it('CW + khe ray = AH thì chấp nhận (biên)', () => {
    const p = presetParams('house-5f')
    p.tech.car.width = 1100
    expect(errorsAt(checkRules(p), 'tech.car.width')).toHaveLength(0)
  })

  it('CD + khoảng đối trọng > BH là lỗi', () => {
    const p = presetParams('house-5f')
    p.tech.car.depth = 1301 // + 600 > 1900
    expect(errorsAt(checkRules(p), 'tech.car.depth')).toHaveLength(1)
  })

  it('OP > lỗ chờ là lỗi (bao che hẹp: OP + 200 luôn đủ, nên dùng bao che rộng với OP 1200)', () => {
    const p = presetParams('house-5f')
    p.tech.door.width = 1200 // rộng 1100 < 1200
    const issues = checkRules(p)
    expect(errorsAt(issues, 'tech.door.width').length).toBeGreaterThanOrEqual(1)
    expect(hasBlockingErrors(issues)).toBe(true)
  })

  it('lỗ chờ > AH − 2×min là lỗi', () => {
    const p = presetParams('house-5f')
    p.tech.shaft.width = 1250 // lỗ chờ rộng 1100 > 1250 − 200
    const issues = checkRules(p)
    expect(errorsAt(issues, 'tech.shaft.width').length).toBeGreaterThanOrEqual(
      1,
    )
  })

  it('HH ≥ chiều cao lỗ chờ thô là lỗi (cả khi bằng)', () => {
    const p = presetParams('house-5f')
    p.tech.door.height = p.structure.roughOpeningHeight
    expect(errorsAt(checkRules(p), 'tech.door.height')).toHaveLength(1)
    p.tech.door.height = p.structure.roughOpeningHeight - 1
    expect(errorsAt(checkRules(p), 'tech.door.height')).toHaveLength(0)
  })

  it('số tầng ≠ số điểm dừng là lỗi', () => {
    const p = presetParams('house-5f')
    p.tech.stops = 6
    expect(errorsAt(checkRules(p), 'floors')).toHaveLength(1)
  })

  it('PIT thấp là cảnh báo, có "kỹ sư cần xác nhận", không chặn xuất', () => {
    const p = presetParams('house-5f')
    p.tech.pit = 1000
    const issues = checkRules(p)
    const w = issues.filter((i) => i.path === 'tech.pit')
    expect(w).toHaveLength(1)
    expect(w[0].level).toBe('warning')
    expect(w[0].message).toContain('kỹ sư cần xác nhận')
    expect(hasBlockingErrors(issues)).toBe(false)
  })

  it('OH thấp là cảnh báo có "kỹ sư cần xác nhận"', () => {
    const p = presetParams('house-5f')
    p.tech.overhead = 3000
    const w = checkRules(p).filter((i) => i.path === 'tech.overhead')
    expect(w).toHaveLength(1)
    expect(w[0].level).toBe('warning')
    expect(w[0].message).toContain('kỹ sư cần xác nhận')
  })

  it('tốc độ ngoài bảng tra thì cảnh báo', () => {
    const p = presetParams('house-5f')
    p.tech.speed = 300
    const w = checkRules(p).filter((i) => i.path === 'tech.speed')
    expect(w).toHaveLength(1)
    expect(w[0].level).toBe('warning')
    expect(w[0].message).toContain('kỹ sư cần xác nhận')
  })
})

describe('hasBlockingErrors', () => {
  it('rỗng hoặc chỉ cảnh báo thì false, có lỗi thì true', () => {
    expect(hasBlockingErrors([])).toBe(false)
    expect(
      hasBlockingErrors([{ level: 'warning', path: 'a', message: 'x' }]),
    ).toBe(false)
    expect(
      hasBlockingErrors([
        { level: 'warning', path: 'a', message: 'x' },
        { level: 'error', path: 'b', message: 'y' },
      ]),
    ).toBe(true)
  })
})

describe('cảnh báo bảng hiệu chỉnh', () => {
  const rev = {
    detail: 'a',
    change: 'b',
    date: 'c',
    number: '1',
    by: 'd',
    checkedBy: 'e',
    approvedBy: 'f',
    requirement: 'g',
  }
  const warnAt = (n: number) => {
    const p = presetParams('house-5f')
    p.revisions = Array.from({ length: n }, () => ({ ...rev }))
    return checkRules(p).filter(
      (i) => i.level === 'warning' && i.path === 'revisions',
    )
  }
  it('có cảnh báo khi số lần > REVISION_TABLE_ROWS', () => {
    expect(warnAt(REVISION_TABLE_ROWS + 1)).toHaveLength(1)
  })
  it('không có cảnh báo khi số lần ≤ REVISION_TABLE_ROWS', () => {
    expect(warnAt(REVISION_TABLE_ROWS)).toHaveLength(0)
    expect(warnAt(0)).toHaveLength(0)
  })
})
