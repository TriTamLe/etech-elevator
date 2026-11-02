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

describe('luật cửa 2S, móc treo và CPM', () => {
  it('cửa 2S là cảnh báo (không chặn xuất)', () => {
    const p = presetParams('house-5f')
    p.tech.door.type = '2S'
    const issues = checkRules(p)
    const w = issues.filter((i) => i.path === 'tech.door.type')
    expect(w).toHaveLength(1)
    expect(w[0].level).toBe('warning')
    expect(hasBlockingErrors(issues)).toBe(false)
  })

  it('cửa CO không có cảnh báo cửa', () => {
    const p = presetParams('house-5f')
    expect(
      checkRules(p).filter((i) => i.path === 'tech.door.type'),
    ).toHaveLength(0)
  })

  it('móc treo x > bề rộng hố là lỗi, đúng path', () => {
    const p = presetParams('house-5f')
    p.topRoom.hook.x = p.tech.shaft.width + 1
    const issues = checkRules(p)
    expect(errorsAt(issues, 'topRoom.hook.x')).toHaveLength(1)
    expect(errorsAt(issues, 'topRoom.hook.y')).toHaveLength(0)
    expect(hasBlockingErrors(issues)).toBe(true)
  })

  it('móc treo y > chiều sâu hố là lỗi, đúng path', () => {
    const p = presetParams('house-5f')
    p.topRoom.hook.y = p.tech.shaft.depth + 1
    const issues = checkRules(p)
    expect(errorsAt(issues, 'topRoom.hook.y')).toHaveLength(1)
    expect(errorsAt(issues, 'topRoom.hook.x')).toHaveLength(0)
    expect(hasBlockingErrors(issues)).toBe(true)
  })

  it('móc treo bằng đúng AH / BH thì chấp nhận (biên)', () => {
    const p = presetParams('house-5f')
    p.topRoom.hook.x = p.tech.shaft.width
    p.topRoom.hook.y = p.tech.shaft.depth
    const issues = checkRules(p)
    expect(errorsAt(issues, 'topRoom.hook.x')).toHaveLength(0)
    expect(errorsAt(issues, 'topRoom.hook.y')).toHaveLength(0)
  })

  it('móc treo null (ở tâm hố) không báo', () => {
    const p = presetParams('house-5f')
    p.topRoom.hook.x = null
    p.topRoom.hook.y = null
    const issues = checkRules(p)
    expect(errorsAt(issues, 'topRoom.hook.x')).toHaveLength(0)
    expect(errorsAt(issues, 'topRoom.hook.y')).toHaveLength(0)
    expect(issues).toEqual([])
  })

  it('CPM rộng hơn hố là lỗi, bằng thì chấp nhận', () => {
    const p = presetParams('house-5f')
    p.topRoom.cpm.w = p.tech.shaft.width + 1
    expect(errorsAt(checkRules(p), 'topRoom.cpm.w')).toHaveLength(1)
    p.topRoom.cpm.w = p.tech.shaft.width
    expect(errorsAt(checkRules(p), 'topRoom.cpm.w')).toHaveLength(0)
  })
})

describe('cảnh báo móc treo sát tường', () => {
  const warnAt = (issues: Array<Issue>, path: string) =>
    issues.filter((i) => i.level === 'warning' && i.path === path)

  it.each([
    [
      'topRoom.hook.x',
      'x',
      'width',
      'sát tường trái',
      (_: number): number => 109,
    ],
    [
      'topRoom.hook.x',
      'x',
      'width',
      'sát tường phải',
      (n: number): number => n - 109,
    ],
    [
      'topRoom.hook.y',
      'y',
      'depth',
      'sát tường trước',
      (_: number): number => 109,
    ],
    [
      'topRoom.hook.y',
      'y',
      'depth',
      'sát tường sau',
      (n: number): number => n - 109,
    ],
  ] as const)(
    '%s (%s) %s: cảnh báo, không chặn xuất',
    (path, axis, dim, _l, at) => {
      const p = presetParams('house-5f')
      p.topRoom.hook[axis] = at(p.tech.shaft[dim])
      const issues = checkRules(p)
      const w = warnAt(issues, path)
      expect(w).toHaveLength(1)
      expect(w[0].message).toContain('tường')
      expect(w[0].message).not.toContain('vách')
      expect(errorsAt(issues, path)).toHaveLength(0)
      expect(hasBlockingErrors(issues)).toBe(false)
    },
  )

  it('đúng ngưỡng 110 từ tường thì không cảnh báo (biên)', () => {
    const p = presetParams('house-5f')
    p.topRoom.hook.x = 110
    p.topRoom.hook.y = 110
    expect(checkRules(p)).toEqual([])
    p.topRoom.hook.x = p.tech.shaft.width - 110
    p.topRoom.hook.y = p.tech.shaft.depth - 110
    expect(checkRules(p)).toEqual([])
  })

  it('móc ngoài hố là lỗi (không kèm cảnh báo sát tường), thông báo dùng "tường"', () => {
    const p = presetParams('house-5f')
    p.topRoom.hook.x = p.tech.shaft.width + 1
    p.topRoom.hook.y = p.tech.shaft.depth + 1
    const issues = checkRules(p)
    for (const path of ['topRoom.hook.x', 'topRoom.hook.y']) {
      const e = errorsAt(issues, path)
      expect(e).toHaveLength(1)
      expect(e[0].message).toContain('tường')
      expect(e[0].message).not.toContain('vách')
      expect(warnAt(issues, path)).toHaveLength(0)
    }
  })

  it('móc null không cảnh báo', () => {
    const p = presetParams('house-5f')
    p.topRoom.hook.x = null
    p.topRoom.hook.y = null
    expect(checkRules(p)).toEqual([])
  })

  it('cảnh báo 2S không nhắc "vách"', () => {
    const p = presetParams('house-5f')
    p.tech.door.type = '2S'
    for (const i of checkRules(p)) expect(i.message).not.toContain('vách')
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

describe('cảnh báo cửa tầng (khung bao che, hộp gọi)', () => {
  const warnAt = (p: ReturnType<typeof presetParams>, path: string) =>
    checkRules(p).filter((i) => i.level === 'warning' && i.path === path)
  const allNarrow = (p: ReturnType<typeof presetParams>) => {
    for (const f of p.floors) f.jamb = 'narrow'
  }
  const noDoors = (p: ReturnType<typeof presetParams>) => {
    for (const f of p.floors) f.hasDoor = false
  }

  describe('tech.door.width: khung rộng OP + 290 > lỗ chờ 1100', () => {
    it.each(['hotel-9f', 'house-5f'] as const)('%s: bộ mẫu không báo', (id) => {
      expect(warnAt(presetParams(id), 'tech.door.width')).toEqual([])
    })

    it('OP 811 bao che rộng báo; OP 810 (khung = lỗ chờ) và OP 800 không báo', () => {
      const p = presetParams('house-5f')
      p.tech.door.width = 811
      const w = warnAt(p, 'tech.door.width')
      expect(w).toHaveLength(1)
      expect(w[0].message).toContain('1101')
      expect(w[0].message).toContain('1100')
      p.tech.door.width = 810
      expect(warnAt(p, 'tech.door.width')).toHaveLength(0)
      p.tech.door.width = 800
      expect(warnAt(p, 'tech.door.width')).toHaveLength(0)
    })

    it('không chặn xuất bản vẽ (chỉ là cảnh báo)', () => {
      const p = presetParams('house-5f')
      p.tech.door.width = 850
      expect(hasBlockingErrors(checkRules(p))).toBe(false)
    })

    it('chỉ dùng bao che hẹp với OP 850 thì không báo (lỗ chờ = OP + 200)', () => {
      const p = presetParams('house-5f')
      allNarrow(p)
      p.tech.door.width = 850
      expect(warnAt(p, 'tech.door.width')).toHaveLength(0)
    })

    it('không tầng nào có cửa thì không báo', () => {
      const p = presetParams('house-5f')
      noDoors(p)
      p.tech.door.width = 850
      expect(warnAt(p, 'tech.door.width')).toHaveLength(0)
    })
  })

  describe('tech.door.width: OP > lỗ chờ chỉ là lỗi, không kèm cảnh báo khung', () => {
    it('OP 1150 bao che rộng: đúng 1 lỗi và 0 cảnh báo ở tech.door.width', () => {
      const p = presetParams('house-5f')
      p.tech.door.width = 1150 // rộng 1100 < 1150; khung 1440 cũng vượt
      const issues = checkRules(p)
      expect(errorsAt(issues, 'tech.door.width')).toHaveLength(1)
      expect(warnAt(p, 'tech.door.width')).toHaveLength(0)
      expect(issues.filter((i) => i.path === 'tech.door.width')).toHaveLength(1)
    })
  })

  describe('tech.door.height: HH < lỗ chờ thô nhưng HH + đầu khung > lỗ chờ thô', () => {
    it('bộ mẫu (HH 2100, thô 2300) không báo', () => {
      for (const id of ['hotel-9f', 'house-5f'] as const) {
        const p = presetParams(id)
        expect(warnAt(p, 'tech.door.height')).toEqual([])
      }
    })

    it('bao che rộng (đầu 200): HH 2100 không báo, HH 2101 báo', () => {
      const p = presetParams('house-5f')
      p.tech.door.height = 2100
      expect(warnAt(p, 'tech.door.height')).toHaveLength(0)
      p.tech.door.height = 2101
      const w = warnAt(p, 'tech.door.height')
      expect(w).toHaveLength(1)
      expect(w[0].message).toContain('2301')
    })

    it('bao che hẹp (đầu 50): HH 2250 không báo, HH 2251 báo', () => {
      const p = presetParams('house-5f')
      allNarrow(p)
      p.tech.door.height = 2250
      expect(warnAt(p, 'tech.door.height')).toHaveLength(0)
      p.tech.door.height = 2251
      expect(warnAt(p, 'tech.door.height')).toHaveLength(1)
    })

    it('chỉ dùng bao che hẹp: HH 2101 (rộng sẽ báo) thì không báo', () => {
      const p = presetParams('house-5f')
      allNarrow(p)
      p.tech.door.height = 2101
      expect(warnAt(p, 'tech.door.height')).toHaveLength(0)
    })

    it('HH ≥ lỗ chờ thô chỉ là lỗi, không thêm cảnh báo', () => {
      const p = presetParams('house-5f')
      p.tech.door.height = 2300
      expect(warnAt(p, 'tech.door.height')).toHaveLength(0)
      expect(errorsAt(checkRules(p), 'tech.door.height')).toHaveLength(1)
    })

    it('không tầng nào có cửa thì không báo', () => {
      const p = presetParams('house-5f')
      noDoors(p)
      p.tech.door.height = 2101
      expect(warnAt(p, 'tech.door.height')).toHaveLength(0)
    })
  })

  describe('structure.callBox.w: hộp gọi rộng hơn đoạn tường hai bên nhỏ nhất', () => {
    it('bộ mẫu (hộp 100) không báo', () => {
      for (const id of ['hotel-9f', 'house-5f'] as const)
        expect(warnAt(presetParams(id), 'structure.callBox.w')).toEqual([])
    })

    it('house-5f dùng cả rộng (tường 200) và hẹp (300): 201 báo, 200 không', () => {
      const p = presetParams('house-5f')
      p.structure.callBox.w = 201
      const w = warnAt(p, 'structure.callBox.w')
      expect(w).toHaveLength(1)
      expect(w[0].message).toContain('200')
      p.structure.callBox.w = 200
      expect(warnAt(p, 'structure.callBox.w')).toHaveLength(0)
    })

    it('chỉ dùng bao che hẹp (tường 300): 250 không báo, 301 báo', () => {
      const p = presetParams('house-5f')
      allNarrow(p)
      p.structure.callBox.w = 250
      expect(warnAt(p, 'structure.callBox.w')).toHaveLength(0)
      p.structure.callBox.w = 301
      expect(warnAt(p, 'structure.callBox.w')).toHaveLength(1)
    })

    it('đoạn tường lẻ nửa mm in dấu phẩy kiểu Việt (300,5), không phải 300.5', () => {
      const p = presetParams('house-5f')
      allNarrow(p)
      p.tech.shaft.width = 1501 // (1501 − 900) / 2 = 300,5
      p.structure.callBox.w = 301
      const w = warnAt(p, 'structure.callBox.w')
      expect(w).toHaveLength(1)
      expect(w[0].message).toContain('300,5')
      expect(w[0].message).not.toContain('300.5')
    })

    it('không tầng nào có cửa thì không báo dù hộp rất rộng', () => {
      const p = presetParams('house-5f')
      noDoors(p)
      p.structure.callBox.w = 5000
      expect(warnAt(p, 'structure.callBox.w')).toHaveLength(0)
    })
  })

  describe('structure.callBox.h: bottom + h > lỗ chờ thô', () => {
    it('bộ mẫu (1100 + 400) không báo', () => {
      for (const id of ['hotel-9f', 'house-5f'] as const)
        expect(warnAt(presetParams(id), 'structure.callBox.h')).toEqual([])
    })

    it('1900 + 400 = 2300 không báo; 1901 + 400 báo', () => {
      const p = presetParams('house-5f')
      p.structure.callBox.bottom = 1900
      expect(warnAt(p, 'structure.callBox.h')).toHaveLength(0)
      p.structure.callBox.bottom = 1901
      const w = warnAt(p, 'structure.callBox.h')
      expect(w).toHaveLength(1)
      expect(w[0].message).toContain('2301')
      expect(hasBlockingErrors(checkRules(p))).toBe(false)
    })

    it('không tầng nào có cửa thì không báo', () => {
      const p = presetParams('house-5f')
      noDoors(p)
      p.structure.callBox.bottom = 3000
      expect(warnAt(p, 'structure.callBox.h')).toHaveLength(0)
    })
  })
})
