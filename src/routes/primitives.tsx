import * as React from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'

import { Icons } from '#/components/app/icons'
import { SheetGallery } from '#/components/app/sheet-gallery'
import type { Sample } from '#/components/app/sheet-gallery'
import { Button } from '#/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { rect, text, underlinedText } from '#/drawing/prims'
import {
  HATCH_NAMES,
  HATCH_PATTERNS,
  breakLine,
  dim,
  dimChain,
  dimStyle,
  doorArrow,
  fitScale,
  hatch,
  leader,
  len,
  prefixLabel,
  sectionMark,
  table,
  toSheet,
  view,
} from '#/drawing/primitives'
import type { Area, HatchName, View } from '#/drawing/primitives'
import { placeSymbol, symbol } from '#/drawing/symbols'
import { SHEET } from '#/drawing/types'
import type { Prim, Pt } from '#/drawing/types'

// Gallery of the shared drawing elements (P8), each on an A3 sheet through the same
// SheetSvg as the preview and the PDF, so the PO can check them against the reference
// set before the figure sheets use them. Client-only like /symbols: the Worker only
// sends the page shell.

export const Route = createFileRoute('/primitives')({
  ssr: false,
  head: () => ({
    meta: [{ title: 'Phần tử vẽ · Công cụ sinh báo cáo thang máy' }],
  }),
  component: PrimitivesPage,
})

/** Usable area of a gallery sheet (no frame): inside the border, below the heading. */
const AREA: Area = { left: 20, top: 30, right: SHEET.width - 20, bottom: 270 }

/** Real-world rectangle as a polygon ring (mm). */
function box(x: number, y: number, w: number, h: number): Array<Pt> {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ]
}

/** Sheet with a border, a bold heading and a note line at the bottom. */
function sheet(
  key: string,
  title: string,
  caption: string,
  body: Array<Prim>,
): Sample {
  return {
    key,
    title,
    caption,
    prims: [
      rect({ x: 5, y: 5, w: SHEET.width - 10, h: SHEET.height - 10 }),
      text(10, 16, title, 5, { bold: true }),
      text(10, SHEET.height - 12, caption, 4),
      ...body,
    ],
  }
}

/** Outline of a real-world rectangle on the sheet. */
function outline(v: View, x: number, y: number, w: number, h: number): Prim {
  const p = toSheet(v, { x, y })
  return rect({ x: p.x, y: p.y, w: len(v, w), h: len(v, h) })
}

// ——— Kích thước ———

/** Hoistway-like box with outer chain dimensions at one text size. */
function dimSample(key: string, size: number, n: number, at: Pt): Sample {
  const v = view(n, at)
  const st = dimStyle(size)
  const off = size * 1.6
  const body: Array<Prim> = [
    outline(v, 0, 0, 1900, 2300),
    outline(v, 200, 200, 1500, 1900),
    ...dimChain(
      v,
      [
        { x: 0, y: 0 },
        { x: 200, y: 0 },
        { x: 1700, y: 0 },
        { x: 1900, y: 0 },
      ],
      {
        dir: 'h',
        offset: -off,
        style: st,
        labels: [undefined, prefixLabel('Chiều rộng = ')],
      },
    ),
    ...dim(
      v,
      { x: 0, y: 0 },
      { x: 0, y: 200 },
      {
        dir: 'v',
        offset: -off,
        style: st,
      },
    ),
    ...dim(
      v,
      { x: 1900, y: 200 },
      { x: 1900, y: 2100 },
      {
        dir: 'v',
        offset: off,
        style: st,
        label: prefixLabel('Chiều sâu = '),
      },
    ),
    ...dimChain(
      v,
      [
        { x: 200, y: 2300 },
        { x: 500, y: 2300 },
        { x: 1400, y: 2300 },
        { x: 1700, y: 2300 },
      ],
      {
        dir: 'h',
        offset: off,
        style: st,
        labels: [undefined, prefixLabel('LỖ CHỜ = ')],
      },
    ),
  ]
  return sheet(
    key,
    `Kích thước, chữ ${String(size).replace('.', ',')} mm`,
    `1:${n} · chuỗi kích thước; đoạn ngắn thì mũi tên quay ra ngoài`,
    body,
  )
}

/** Vertical-section style: small text, level chain, text labels and ticks. */
function sectionDimSample(): Sample {
  // Levels from the pit floor up; a section passes y = −level (y points down).
  const v = view(75, { x: 120, y: 268 })
  const st = dimStyle(1.85)
  const levels = [0, 1400, 5300, 8900, 12500, 17300]
  const pts = levels.map((level) => ({ x: 0, y: -level }))
  const words = [
    'PIT = 1400',
    'THEO THỰC TẾ',
    'THEO THỰC TẾ',
    'THEO THỰC TẾ',
    'OH = 4800',
  ]
  const body: Array<Prim> = [
    outline(v, 0, -17300, 2100, 17300),
    ...dimChain(v, pts, {
      dir: 'v',
      offset: -6,
      style: st,
      labels: words.map((w) => () => w),
    }),
    ...dimChain(v, pts, { dir: 'v', offset: -12, style: st }),
    ...dimChain(
      v,
      [
        { x: 0, y: 0 },
        { x: 2100, y: 0 },
      ],
      { dir: 'h', offset: 5, style: st, labels: [() => 'BH'] },
    ),
  ]
  // Same chain with architectural ticks, at a larger text size.
  const v2 = view(75, { x: 260, y: 268 })
  const st2 = dimStyle(3, { head: 'tick' })
  body.push(
    outline(v2, 0, -17300, 2100, 17300),
    ...dimChain(v2, pts, { dir: 'v', offset: 8, style: st2 }),
    ...dimChain(
      v2,
      [
        { x: 0, y: -17300 },
        { x: 2100, y: -17300 },
      ],
      { dir: 'h', offset: -6, style: st2 },
    ),
  )
  return sheet(
    'dim-section',
    'Kích thước mặt cắt đứng, chữ 1,85 mm',
    '1:75 · nhãn chữ thay số (THEO THỰC TẾ); bên phải là đầu gạch chéo, chữ 3 mm',
    body,
  )
}

// ——— Ký hiệu vật liệu (hatch) ———

/** Every pattern in its own square at one drawing scale, with the DWG's pattern scale. */
const DWG_SCALE: Record<HatchName, number> = {
  'AR-CONC': 10,
  'AR-BRSTD': 20,
  ANSI31: 100,
  ANSI32: 100,
  ANSI34: 50,
  BRSTONE: 80,
  'AR-B816C': 5,
}

function hatchGrid(key: string, n: number, side: number): Sample {
  const body: Array<Prim> = []
  HATCH_NAMES.forEach((name, i) => {
    const col = i % 4
    const row = Math.floor(i / 4)
    const at = { x: 30 + col * 95, y: 40 + row * 115 }
    const v = view(n, at)
    body.push(
      ...hatch(v, [box(0, 0, side, side)], name, {
        scale: DWG_SCALE[name],
        outline: 'medium',
      }),
      text(
        at.x,
        at.y + len(v, side) + 7,
        `${HATCH_PATTERNS[name].label}`,
        4.5,
        {
          bold: true,
        },
      ),
      text(
        at.x,
        at.y + len(v, side) + 13,
        `${name} · tỷ lệ mẫu ${DWG_SCALE[name]}`,
        3.5,
      ),
    )
  })
  return sheet(
    key,
    `Ký hiệu vật liệu theo bản CAD mẫu, hình 1:${n}`,
    `Mỗi ô ${side} × ${side} mm thật, vẽ theo tỷ lệ mẫu của bản CAD`,
    body,
  )
}

function hatchShapes(): Sample {
  const v = view(20, { x: 40, y: 45 })
  const L = [
    { x: 0, y: 0 },
    { x: 2400, y: 0 },
    { x: 2400, y: 700 },
    { x: 800, y: 700 },
    { x: 800, y: 3000 },
    { x: 0, y: 3000 },
  ]
  const v2 = view(20, { x: 230, y: 45 })
  const body: Array<Prim> = [
    ...hatch(v, [L, box(200, 200, 400, 300)], 'AR-CONC', {
      scale: 20,
      outline: 'medium',
    }),
    text(40, 205, 'Hình chữ L có lỗ (bê tông, tỷ lệ mẫu 20)', 4),
    // Two neighbouring walls hatched separately: the courses run on across the joint.
    ...hatch(v2, [box(0, 0, 1500, 1200)], 'AR-BRSTD', {
      scale: 20,
      outline: 'medium',
    }),
    ...hatch(v2, [box(1500, 0, 1500, 1200)], 'AR-BRSTD', {
      scale: 20,
      outline: 'medium',
    }),
    text(230, 120, 'Hai vùng kề nhau: hàng gạch nối liền qua mạch', 4),
  ]
  return sheet(
    'hatch-shapes',
    'Ký hiệu vật liệu trên vùng bất kỳ',
    '1:20 · vùng có lỗ; hai vùng kề nhau nối liền nét như bản CAD',
    body,
  )
}

// ——— Ghi chú và ký hiệu ———

function marksSample(): Sample {
  const body: Array<Prim> = [
    // Leaders: target left / right of the note, several lines, no star.
    rect({ x: 30, y: 50, w: 30, h: 20 }),
    ...leader({ x: 60, y: 55 }, { x: 80, y: 45 }, ['Vị trí đặt máy'], {
      size: 3.5,
    }),
    ...leader(
      { x: 60, y: 68 },
      { x: 80, y: 70 },
      [
        'Đà bê tông giữa tầng 200x200',
        'hai mặt hông và sau hố thang',
        'khoảng cách giữa 2 đà = 1500',
      ],
      { size: 3.5 },
    ),
    rect({ x: 200, y: 50, w: 30, h: 20 }),
    ...leader(
      { x: 200, y: 66 },
      { x: 140, y: 82 },
      ['Xây chèn sau', 'khi lắp xong cửa'],
      { size: 5, star: false, head: 'none' },
    ),
    // Break lines across a strip of wall.
    rect({ x: 260, y: 40, w: 40, h: 60 }),
    ...breakLine({ x: 260, y: 70 }, { x: 300, y: 70 }, { overshoot: 6 }),
    text(310, 72, 'Đường ngắt', 4),
    // Door arrows: default, and pointing right without its label.
    ...doorArrow({ x: 80, y: 130 }),
    ...doorArrow({ x: 200, y: 140 }, { rotate: 90, label: null }),
    // Section marks and an underlined title.
    ...sectionMark({ x: 250, y: 140 }, 'A'),
    ...sectionMark({ x: 280, y: 140 }, 'B'),
    ...sectionMark({ x: 310, y: 140 }, 'C'),
    ...underlinedText(210, 200, 'MẶT CẮT C-C', 6.5, { anchor: 'middle' }),
    ...underlinedText(30, 230, 'Ghi chú :', 6),
    text(
      30,
      239,
      '- Phần xây chèn và hoàn thiện bề mặt sau khi nhà thầu lắp xong cửa thang máy',
      5,
    ),
  ]
  return sheet(
    'marks',
    'Ghi chú, đường ngắt, mũi tên cửa, ký hiệu mặt cắt',
    'Kích thước theo trang mẫu; ghi chú có dấu * và gạch chân dòng đầu',
    body,
  )
}

function tableSample(): Sample {
  const x = 150
  const rows = [
    ['5F (OH)', '4800 (3600 + 1200 )'],
    ['3F - 4F', '3600'],
    ['2F', '3600'],
    ['1F', '3900'],
    ['PIT', '1400'],
  ]
  const body: Array<Prim> = [
    text(x, 52, 'CHIỀU CAO TẦNG THỰC TẾ', 4.17),
    ...table({
      x,
      y: 58,
      cols: [22, 38],
      size: 4.17,
      minSize: 3,
      rows: [
        { h: 11.8, cells: [{ text: 'Chiều cao các tầng', span: 2 }] },
        ...rows.map(([a, b]) => ({
          h: 10.5,
          cells: [{ text: a }, { text: b }],
        })),
      ],
    }),
    // Overlong text shrinks, then ends with "…".
    ...table({
      x,
      y: 150,
      cols: [22, 38],
      size: 4.17,
      minSize: 3,
      rows: [
        {
          h: 10.5,
          cells: [
            { text: 'TẦNG KỸ THUẬT MÁI' },
            { text: '4800 (3600 + 1200) + 350 + 120 + 75' },
          ],
        },
      ],
    }),
  ]
  return sheet(
    'table',
    'Bảng chiều cao tầng',
    'Ô tiêu đề gộp 2 cột; chữ dài tự co rồi mới cắt "…"',
    body,
  )
}

// ——— Tự chọn tỷ lệ ———

function fitSample(): Sample {
  const shafts = [
    { w: 1900, h: 2300 },
    { w: 2600, h: 3100 },
    { w: 4400, h: 5200 },
  ]
  const body: Array<Prim> = []
  shafts.forEach((s, i) => {
    const area: Area = {
      left: AREA.left + i * 127,
      top: 60,
      right: AREA.left + (i + 1) * 127 - 7,
      bottom: 230,
    }
    const v = fitScale({ x: 0, y: 0, w: s.w, h: s.h }, { area, pad: 10 })
    body.push(
      rect(
        {
          x: area.left,
          y: area.top,
          w: area.right - area.left,
          h: area.bottom - area.top,
        },
        { weight: 'thin' },
      ),
      outline(v, 0, 0, s.w, s.h),
      ...dimChain(
        v,
        [
          { x: 0, y: 0 },
          { x: s.w, y: 0 },
        ],
        { dir: 'h', offset: -4, style: dimStyle(3) },
      ),
      text(area.left, area.bottom + 8, `${s.w} × ${s.h} mm → 1:${v.n}`, 4),
    )
  })
  return sheet(
    'fit',
    'Tự chọn tỷ lệ',
    'Chọn tỷ lệ lớn nhất trong 1:10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 200 mà hình vẫn vừa khung mảnh',
    body,
  )
}

// ——— Ví dụ ghép ———

function combinedSample(): Sample {
  const W = 1500 // shaft width (inside)
  const D = 1900 // shaft depth (inside)
  const T = 200 // wall
  const opening = 900
  const side = (W - opening) / 2
  const v = fitScale(
    { x: -T, y: -T, w: W + 2 * T, h: D + 2 * T },
    { area: AREA, pad: { top: 22, left: 18, right: 24, bottom: 52 } },
  )
  const st = dimStyle(8)
  const brick = { scale: 20, outline: 'medium' as const }
  const conc = { scale: 10, outline: 'medium' as const }
  const doorAt = toSheet(v, { x: W / 2, y: D })
  const front = toSheet(v, { x: W / 2, y: D + T })
  const body: Array<Prim> = [
    // Walls: brick sides and back, concrete corner columns, front wall with the opening.
    ...hatch(v, [box(0, -T, W, T)], 'AR-BRSTD', brick),
    ...hatch(v, [box(-T, 0, T, D)], 'AR-BRSTD', brick),
    ...hatch(v, [box(W, 0, T, D)], 'AR-BRSTD', brick),
    ...hatch(v, [box(0, D, side, T)], 'AR-BRSTD', brick),
    ...hatch(v, [box(W - side, D, side, T)], 'AR-BRSTD', brick),
    ...[
      [-T, -T],
      [W, -T],
      [-T, D],
      [W, D],
    ].flatMap(([x, y]) => hatch(v, [box(x, y, T, T)], 'AR-CONC', conc)),
    // Door and sill from the DWG symbol library (OP 700, no stretch).
    ...placeSymbol(symbol('door-co-plan'), { at: doorAt, scale: v.scale }),
    ...dimChain(
      v,
      [
        { x: -T, y: -T },
        { x: 0, y: -T },
        { x: W, y: -T },
        { x: W + T, y: -T },
      ],
      {
        dir: 'h',
        offset: -10,
        style: st,
        labels: [undefined, prefixLabel('Chiều rộng = ')],
      },
    ),
    ...dim(
      v,
      { x: -T, y: -T },
      { x: -T, y: 0 },
      {
        dir: 'v',
        offset: -8,
        style: st,
      },
    ),
    ...dim(
      v,
      { x: W + T, y: 0 },
      { x: W + T, y: D },
      {
        dir: 'v',
        offset: 12,
        style: st,
        label: prefixLabel('Chiều sâu = '),
      },
    ),
    ...dimChain(
      v,
      [
        { x: 0, y: D + T },
        { x: side, y: D + T },
        { x: W - side, y: D + T },
        { x: W, y: D + T },
      ],
      {
        dir: 'h',
        offset: 10,
        style: st,
        labels: [undefined, prefixLabel('LỖ CHỜ = ')],
      },
    ),
    ...leader(
      toSheet(v, { x: side / 2, y: D + T }),
      { x: front.x - len(v, W) / 2 - 62, y: front.y + 20 },
      ['Xây chèn sau', 'khi lắp xong cửa'],
      { size: 6, star: false, head: 'none' },
    ),
    ...doorArrow({ x: front.x, y: front.y + 24 }),
  ]
  return sheet(
    'combined',
    'Ví dụ ghép (chưa phải trang thật)',
    `1:${v.n} · tường gạch, cột bê tông, kích thước bao, ký hiệu cửa từ thư viện, mũi tên cửa`,
    body,
  )
}

function PrimitivesPage() {
  const dims = React.useMemo(
    () => [
      dimSample('dim-plan', 8, 15, { x: 150, y: 60 }),
      dimSample('dim-door', 4.9, 25, { x: 160, y: 60 }),
      dimSample('dim-door-small', 2.4, 40, { x: 180, y: 70 }),
      sectionDimSample(),
    ],
    [],
  )
  const hatches = React.useMemo(
    () => [
      hatchGrid('hatch-20', 20, 1500),
      hatchGrid('hatch-75', 75, 5000),
      hatchShapes(),
    ],
    [],
  )
  const marks = React.useMemo(() => [marksSample(), tableSample()], [])
  const layout = React.useMemo(() => [fitSample(), combinedSample()], [])

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 pt-6 pb-16 sm:px-6">
      <header className="flex items-start gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" asChild>
              <Link to="/" aria-label="Về danh sách dự án">
                <Icons.back aria-hidden="true" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Danh sách dự án</TooltipContent>
        </Tooltip>
        <div className="grid min-w-0 gap-1">
          <h1 className="text-(length:--text-xl) font-semibold text-balance">
            Phần tử vẽ
          </h1>
          <p className="text-(length:--text-sm) text-(--color-ink-2)">
            Kích thước, ký hiệu vật liệu, ghi chú và các ký hiệu nhỏ dùng chung
            cho các trang hình. Cỡ chữ và mẫu vật liệu lấy theo bản vẽ CAD mẫu.
          </p>
        </div>
      </header>

      <SheetGallery
        title="Kích thước"
        description="Số in ra luôn tính từ kích thước thật. Cỡ chữ đổi theo trang: mặt bằng khoảng 8 mm, cửa tầng 2,4–4,9 mm, mặt cắt đứng khoảng 1,85 mm."
        samples={dims}
      />
      <SheetGallery
        title="Ký hiệu vật liệu"
        description="Bê tông, gạch và các mẫu khác chép đúng từ bản CAD mẫu, cùng một kết quả mỗi lần vẽ."
        samples={hatches}
      />
      <SheetGallery title="Ghi chú và ký hiệu" samples={marks} />
      <SheetGallery title="Tỷ lệ và ví dụ ghép" samples={layout} />
    </main>
  )
}
