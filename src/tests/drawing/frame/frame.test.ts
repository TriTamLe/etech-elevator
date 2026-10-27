import { describe, expect, it } from 'vitest'

import { DOC_TYPES, REVISION_TABLE_ROWS } from '#/domain/config'
import { derive } from '#/domain/derive'
import type { Page } from '#/domain/derive'
import { presetParams } from '#/domain/presets'
import type { Revision } from '#/domain/schema'
import { framed } from '#/drawing/frame'
import { TITLE } from '#/drawing/frame/layout'
import { printedRevisions, revisionTable } from '#/drawing/frame/revision-table'
import { pageStamp, titleBlock } from '#/drawing/frame/title-block'
import { textSpan, texts } from '#/tests/drawing/helpers'

const params = () => presetParams('house-5f')
const page = (code = 'DTP 01', key: Page['key'] = 'responsibility'): Page => ({
  key,
  code,
  title: 'Hạng mục trách nhiệm',
})
const rev = (n: number): Revision => ({
  detail: `chi tiết ${n}`,
  change: `sửa ${n}`,
  date: `0${n}/01`,
  number: `${n}`,
  by: `NV${n}`,
  checkedBy: `KT${n}`,
  approvedBy: `D${n}`,
  requirement: `yc ${n}`,
})

describe('titleBlock', () => {
  it.each(DOC_TYPES.map((t, i) => [t, i] as const))(
    'docType %s: đúng 1 ô đặc ở hàng %i',
    (type, i) => {
      const p = params()
      p.project.docType = type
      const filled = titleBlock(p, derive(p), page()).filter(
        (x) => x.kind === 'rect' && x.fill === 'ink',
      )
      expect(filled).toHaveLength(1)
      const r = filled[0] as { y: number; h: number }
      expect(r.y).toBeGreaterThan(TITLE.issued.rows[i])
      expect(r.y + r.h).toBeLessThan(TITLE.issued.rows[i + 1])
    },
  )

  it('mã trang tách đôi DTP / 01', () => {
    const t = texts(titleBlock(params(), derive(params()), page('DTP 01'))).map(
      (x) => x.text,
    )
    expect(t).toContain('DTP')
    expect(t).toContain('01')
  })

  it('text nằm trong [TITLE.left, TITLE.right], kể cả chuỗi 300 ký tự', () => {
    const p = params()
    const long = 'Trần Văn Nguyễn '.repeat(25).slice(0, 300)
    p.project.name = long
    p.project.address = long
    p.project.shortAddress = long
    p.project.designer = long
    p.project.checker = long
    p.project.approver = long
    p.project.revisionNo = long
    p.project.completedDate = long
    for (const pr of [
      titleBlock(p, derive(p), page()),
      titleBlock(
        presetParams('hotel-9f'),
        derive(presetParams('hotel-9f')),
        page('DTP 08', 'machine-room'),
      ),
    ])
      for (const t of texts(pr)) {
        const [a, b] = textSpan(t)
        expect(a, t.text).toBeGreaterThanOrEqual(TITLE.left - 1e-6)
        expect(b, t.text).toBeLessThanOrEqual(TITLE.right + 1e-6)
      }
  })
})

describe('pageStamp', () => {
  it('override theo trang thắng giá trị dự án', () => {
    const p = params()
    p.project.revisionNo = '1'
    p.project.completedDate = '01/01'
    p.project.pageOverrides = {
      responsibility: { revisionNo: '3', completedDate: '05/05' },
    }
    expect(pageStamp(p, page())).toEqual({
      revisionNo: '3',
      completedDate: '05/05',
    })
    expect(pageStamp(p, page('DTP 02', 'spec'))).toEqual({
      revisionNo: '1',
      completedDate: '01/01',
    })
  })
  it('override rỗng/khoảng trắng dùng giá trị dự án', () => {
    const p = params()
    p.project.revisionNo = '1'
    p.project.completedDate = '01/01'
    p.project.pageOverrides = {
      responsibility: { revisionNo: '', completedDate: '   ' },
    }
    expect(pageStamp(p, page())).toEqual({
      revisionNo: '1',
      completedDate: '01/01',
    })
  })
})

describe('revision table', () => {
  it('printedRevisions chỉ trả REVISION_TABLE_ROWS lần mới nhất', () => {
    const p = params()
    p.revisions = [rev(1), rev(2), rev(3)]
    const out = printedRevisions(p)
    expect(out).toHaveLength(Math.min(3, REVISION_TABLE_ROWS))
    expect(out[out.length - 1]).toEqual(rev(3))
  })
  it('với 3 lần hiệu chỉnh in lần cuối, không in lần đầu', () => {
    const p = params()
    p.revisions = [rev(1), rev(2), rev(3)]
    const t = texts(revisionTable(p)).map((x) => x.text)
    expect(t).toContain('chi tiết 3')
    expect(t).not.toContain('chi tiết 1')
  })
  it('không có hiệu chỉnh: chỉ có tiêu đề cột', () => {
    const t = texts(revisionTable(params())).map((x) => x.text)
    expect(t).toContain('Chi tiết')
    expect(t.some((x) => x.startsWith('chi tiết'))).toBe(false)
  })
})

describe('framed', () => {
  it('border + bảng hiệu chỉnh + khung tên + nội dung (nội dung ở cuối)', () => {
    const p = params()
    const marker = {
      kind: 'line' as const,
      a: { x: 1, y: 1 },
      b: { x: 2, y: 2 },
    }
    const out = framed(p, derive(p), page(), [marker])
    expect(out[out.length - 1]).toBe(marker)
    expect(out.length).toBe(
      2 + revisionTable(p).length + titleBlock(p, derive(p), page()).length + 1,
    )
    expect(derive(p).pages.length).toBeGreaterThan(0)
  })
})
