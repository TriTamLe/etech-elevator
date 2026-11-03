import { describe, expect, it } from 'vitest'

import { DOC_TYPES } from '#/domain/config'
import { derive } from '#/domain/derive'
import { presetParams } from '#/domain/presets'
import { framed } from '#/drawing/frame'
import { renderPage } from '#/drawing/pages'
import { LANDING_TITLE } from '#/drawing/sheets/landing-door'
import type { ElevatorParams } from '#/domain/schema'
import { BORDER } from '#/drawing/frame/layout'
import {
  expectInside,
  numbersOf,
  textSpan,
  texts,
} from '#/tests/drawing/helpers'

describe('renderPage', () => {
  it.each(['hotel-9f', 'house-5f'] as const)(
    '%s: cover không có khung tên, trang khác có',
    (id) => {
      const p = presetParams(id)
      const d = derive(p)
      for (const page of d.pages) {
        const t = texts(renderPage(p, d, page)).map((x) => x.text)
        if (page.key === 'cover') expect(t).not.toContain('LOẠI HỒ SƠ')
        else expect(t, page.key).toContain('LOẠI HỒ SƠ')
      }
    },
  )

  it.each(['hotel-9f', 'house-5f'] as const)(
    '%s: các trang hình (plan, pit, machine-room) có khung và hình, số hữu hạn',
    (id) => {
      const p = presetParams(id)
      const d = derive(p)
      for (const key of ['plan', 'pit', 'machine-room'] as const) {
        const page = d.pages.find((x) => x.key === key)!
        const out = renderPage(p, d, page)
        const t = texts(out).map((x) => x.text)
        expect(t, key).toContain('LOẠI HỒ SƠ')
        expect(t, key).toContain('Hướng cửa vào thang máy')
        for (const q of out)
          for (const n of numbersOf(q))
            expect(Number.isFinite(n), key).toBe(true)
      }
    },
  )

  // Ngưỡng rộng: chỉ bắt lỗi chậm bất thường (vẽ thử 1:1 rồi vẽ thật).
  it.each(['hotel-9f', 'house-5f'] as const)(
    '%s: mỗi trang hình vẽ dưới 500 ms',
    (id) => {
      const p = presetParams(id)
      const d = derive(p)
      for (const key of ['plan', 'pit', 'section', 'machine-room'] as const) {
        const page = d.pages.find((x) => x.key === key)!
        renderPage(p, d, page) // làm nóng
        const t0 = performance.now()
        renderPage(p, d, page)
        expect(performance.now() - t0, key).toBeLessThan(500)
      }
    },
  )

  it.each(['hotel-9f', 'house-5f'] as const)(
    '%s: 2 trang cửa tầng có hình (không còn là khung trống), số hữu hạn',
    (id) => {
      const p = presetParams(id)
      const d = derive(p)
      const empty = framed(
        p,
        d,
        d.pages.find((x) => x.key === 'section')!,
        [], // khung trống, không hình
      )
      for (const key of ['landing-wide', 'landing-narrow'] as const) {
        const page = d.pages.find((x) => x.key === key)!
        const out = renderPage(p, d, page)
        const t = texts(out).map((x) => x.text)
        expect(t, key).toContain('LOẠI HỒ SƠ')
        expect(t, key).toContain(LANDING_TITLE)
        expect(out.length, key).toBeGreaterThan(empty.length + 100)
        for (const q of out)
          for (const n of numbersOf(q))
            expect(Number.isFinite(n), key).toBe(true)
      }
    },
  )

  it.each(['hotel-9f', 'house-5f'] as const)(
    '%s: trang mặt cắt đứng (DTP 05) có hình lớn hơn khung trống, chữ tầng và PIT/OH',
    (id) => {
      const p = presetParams(id)
      const d = derive(p)
      const page = d.pages.find((x) => x.key === 'section')!
      const empty = framed(p, d, page, [])
      const out = renderPage(p, d, page)
      const t = texts(out).map((x) => x.text)
      expect(out.length).toBeGreaterThan(empty.length + 200)
      expect(t).toContain('TẦNG 1F')
      expect(t).toContain(`PIT = ${p.tech.pit}`)
      expect(t).toContain(`OH = ${p.tech.overhead + p.tech.topRoomHeight}`)
    },
  )

  it.each(['hotel-9f', 'house-5f'] as const)(
    '%s: mỗi trang cửa tầng vẽ dưới 500 ms',
    (id) => {
      const p = presetParams(id)
      const d = derive(p)
      for (const key of ['landing-wide', 'landing-narrow'] as const) {
        const page = d.pages.find((x) => x.key === key)!
        renderPage(p, d, page) // làm nóng
        const t0 = performance.now()
        renderPage(p, d, page)
        expect(performance.now() - t0, key).toBeLessThan(500)
      }
    },
  )

  it('mọi tầng bao che hẹp: chỉ 1 trang cửa tầng (DTP 06), phòng máy dồn lên DTP 07', () => {
    const p = presetParams('house-5f')
    for (const f of p.floors) f.jamb = 'narrow'
    const d = derive(p)
    const keys = d.pages.map((x) => `${x.code}:${x.key}`)
    expect(keys).toEqual([
      ':cover',
      'DTP 01:responsibility',
      'DTP 02:spec',
      'DTP 03:plan',
      'DTP 04:pit',
      'DTP 05:section',
      'DTP 06:landing-narrow',
      'DTP 07:machine-room',
    ])
    const landing = d.pages.find((x) => x.key === 'landing-narrow')!
    const t = texts(renderPage(p, d, landing)).map((x) => x.text)
    expect(t).toContain('DTP')
    expect(t).toContain('06')
    expect(t).toContain('Tầng 1F ~ 5F : bao che hẹp')
  })

  it('house-5f: cửa tầng rộng DTP 06, hẹp DTP 07, phòng máy DTP 08', () => {
    const d = derive(presetParams('house-5f'))
    expect(d.pages.slice(-3).map((x) => `${x.code}:${x.key}`)).toEqual([
      'DTP 06:landing-wide',
      'DTP 07:landing-narrow',
      'DTP 08:machine-room',
    ])
  })
})

describe('renderPage: trường hợp biên (mọi trang)', () => {
  type Id = 'hotel-9f' | 'house-5f'
  const clone = (id: Id) => structuredClone<ElevatorParams>(presetParams(id))
  /** Inside the outer border; texts measured by their real width. */
  const SHEET = {
    left: BORDER.outer.x,
    top: BORDER.outer.y,
    right: BORDER.outer.x + BORDER.outer.w,
    bottom: BORDER.outer.y + BORDER.outer.h,
  }
  function drawAll(p: ElevatorParams) {
    const d = derive(p)
    for (const page of d.pages) {
      const out = renderPage(p, d, page)
      expect(out.length, page.key).toBeGreaterThan(0)
      for (const q of out)
        for (const n of numbersOf(q))
          expect(Number.isFinite(n), page.key).toBe(true)
      expectInside(out, SHEET)
      for (const t of texts(out)) {
        if (t.rotate) continue
        const [x0, x1] = textSpan(t)
        expect(x0, `${page.key}: ${t.text}`).toBeGreaterThanOrEqual(
          SHEET.left - 0.01,
        )
        expect(x1, `${page.key}: ${t.text}`).toBeLessThanOrEqual(
          SHEET.right + 0.01,
        )
      }
    }
    return d.pages.length
  }
  function withFloors(id: Id, n: number): ElevatorParams {
    const p = clone(id)
    const mid = p.floors[1]
    p.floors = Array.from({ length: n }, (_, i) => ({
      ...(i === 0 ? p.floors[0] : mid),
      name: `${i + 1}F`,
    }))
    p.tech.stops = n
    p.tech.doors = n
    return p
  }
  const ids = ['hotel-9f', 'house-5f'] as const

  it.each(
    ids.flatMap((id) => [2, 3, 4, 5, 10, 20, 30].map((n) => [id, n] as const)),
  )('%s, N = %i: đủ trang, số hữu hạn, nằm trong khổ giấy', (id, n) => {
    expect(drawAll(withFloors(id, n))).toBeGreaterThanOrEqual(8)
  })

  const long = 'TÊN RẤT DÀI CỦA CÔNG TRÌNH NHÀ Ở KẾT HỢP VĂN PHÒNG CHO THUÊ '
  const variants: Array<[string, (p: ElevatorParams) => void]> = [
    [
      'tên rất dài (dự án, địa chỉ, người ký, buồng trên, tầng)',
      (p) => {
        p.project.name = long.repeat(3).trim()
        p.project.address =
          `${long}SỐ 123 ĐƯỜNG RẤT DÀI, PHƯỜNG, QUẬN, THÀNH PHỐ`.repeat(2)
        p.project.shortAddress = ''
        p.project.designer = 'NGUYỄN VĂN THIẾT KẾ CÓ TÊN RẤT DÀI'
        p.project.checker = 'TRẦN THỊ KIỂM TRA CÓ TÊN RẤT DÀI'
        p.project.approver = 'LÊ VĂN DUYỆT CÓ TÊN RẤT DÀI'
        p.topRoom.name = 'PHÒNG KỸ THUẬT THANG MÁY TRÊN MÁI'
        p.floors[1].name = 'TẦNG LỬNG KỸ THUẬT'
      },
    ],
    [
      'thiếu chiều cao mọi tầng',
      (p) => {
        for (const f of p.floors) f.height = null
      },
    ],
    [
      'không tầng nào có cửa',
      (p) => {
        for (const f of p.floors) f.hasDoor = false
      },
    ],
    [
      'mọi tầng bao che rộng',
      (p) => {
        for (const f of p.floors) f.jamb = 'wide'
      },
    ],
    [
      'mọi tầng bao che hẹp',
      (p) => {
        for (const f of p.floors) f.jamb = 'narrow'
      },
    ],
    ['ghi chú tường xây chèn bật', (p) => void (p.structure.infillNote = true)],
    [
      'ghi chú tường xây chèn tắt',
      (p) => void (p.structure.infillNote = false),
    ],
    ['cửa 2S', (p) => void (p.tech.door.type = '2S')],
    ['thang có phòng máy', (p) => void (p.tech.liftType = 'machine-room')],
    ['thang MRL', (p) => void (p.tech.liftType = 'mrl')],
    ['đỡ máy bằng sàn', (p) => void (p.topRoom.machineSupport = 'floor')],
    ['đỡ máy bằng dầm', (p) => void (p.topRoom.machineSupport = 'beams')],
    [
      'móc treo nhập tay sát góc',
      (p) => {
        p.topRoom.hook.x = 50
        p.topRoom.hook.y = 50
      },
    ],
    ...DOC_TYPES.map((t): [string, (p: ElevatorParams) => void] => [
      `loại hồ sơ ${t}`,
      (p) => void (p.project.docType = t),
    ]),
  ]
  for (const id of ids)
    it.each(variants)(`${id}: %s`, (_name, mut) => {
      const p = clone(id)
      mut(p)
      drawAll(p)
    })
})
