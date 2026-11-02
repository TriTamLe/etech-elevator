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
import { hline, rect, text, vline } from '#/drawing/prims'
import { SYMBOL_IDS, placeSymbol, placedBox, symbol } from '#/drawing/symbols'
import type { PlaceOpts, SymbolData, SymbolId } from '#/drawing/symbols'
import { SHEET } from '#/drawing/types'

// The symbol library taken from the reference DWG: each symbol on its own A3 sheet with
// its bounds, insertion point (+) and real size, then a few stretch examples. Drawn
// through the same SheetSvg as the preview and the PDF. Client-only: drawing ~3000
// strokes on the Worker would blow its 10 ms CPU budget for no benefit.

export const Route = createFileRoute('/symbols')({
  ssr: false,
  head: () => ({
    meta: [{ title: 'Thư viện ký hiệu · Công cụ sinh báo cáo thang máy' }],
  }),
  component: SymbolsPage,
})

/** Drawing scales of the reference set, largest first. */
const SCALES = [1, 2, 5, 10, 20, 25, 50]
const AREA = { x: 20, y: 30, w: SHEET.width - 40, h: SHEET.height - 60 }

/** Largest reference scale at which the (stretched) symbol fits the drawing area. */
function fitScale(sym: SymbolData, stretch: PlaceOpts['stretch']): number {
  for (const n of SCALES) {
    const b = placedBox(sym, { at: { x: 0, y: 0 }, scale: 1 / n, stretch })
    if (b.w <= AREA.w && b.h <= AREA.h) return n
  }
  return SCALES[SCALES.length - 1]
}

function sample(
  id: SymbolId,
  title: string,
  stretch?: PlaceOpts['stretch'],
): Sample {
  const sym = symbol(id)
  const n = fitScale(sym, stretch)
  // Centre the placed bounds in the drawing area.
  const probe = placedBox(sym, { at: { x: 0, y: 0 }, scale: 1 / n, stretch })
  const at = {
    x: AREA.x + (AREA.w - probe.w) / 2 - probe.x,
    y: AREA.y + (AREA.h - probe.h) / 2 - probe.y,
  }
  const o: PlaceOpts = { at, scale: 1 / n, stretch, weight: 'medium' }
  const box = placedBox(sym, o)
  const caption = `1:${n} · ${Math.round(box.w * n)} × ${Math.round(box.h * n)} mm`
  const stretchNote = sym.stretch
    .map((l) => `${l.axis} ${l.dir > 0 ? '>' : '<'} ${l.at}`)
    .join(', ')
  const cross = 4
  return {
    key: stretch ? `${id}-stretch` : id,
    title,
    caption,
    prims: [
      rect({ x: 5, y: 5, w: SHEET.width - 10, h: SHEET.height - 10 }),
      text(10, 16, `${sym.id} · ${title}`, 5, { bold: true }),
      text(
        10,
        SHEET.height - 12,
        `${caption} · kéo giãn: ${stretchNote || 'không'}`,
        4,
      ),
      rect(box, { weight: 'thin' }),
      hline(at.y, at.x - cross, at.x + cross, 'thick'),
      vline(at.x, at.y - cross, at.y + cross, 'thick'),
      ...placeSymbol(sym, o),
    ],
  }
}

/** Stretch examples: real mm added along each symbol's stretch lines. */
const STRETCH_SAMPLES: Array<[SymbolId, string, PlaceOpts['stretch']]> = [
  ['door-front', 'Cửa nhìn trước, OP 700 → 900', { x: 200 }],
  ['door-co-plan', 'Cửa mặt bằng, rộng thêm 200', { x: 200 }],
  [
    'jamb-wide-jd320',
    'Bao che rộng, lỗ chờ +200 và HH +300',
    { x: 200, y: 300 },
  ],
  [
    'jamb-narrow-35x50',
    'Bao che hẹp, lỗ chờ +200 và HH +300',
    { x: 200, y: 300 },
  ],
  ['car-side', 'Cabin cao thêm 300', { y: 300 }],
]

function SymbolsPage() {
  const library = React.useMemo(
    () => SYMBOL_IDS.map((id) => sample(id, symbol(id).label)),
    [],
  )
  const stretched = React.useMemo(
    () =>
      STRETCH_SAMPLES.map(([id, title, stretch]) => sample(id, title, stretch)),
    [],
  )

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
            Thư viện ký hiệu
          </h1>
          <p className="text-(length:--text-sm) text-(--color-ink-2)">
            {SYMBOL_IDS.length} ký hiệu lấy từ bản vẽ CAD mẫu, dùng cho các
            trang hình. Dấu + là điểm chèn; khung mảnh là kích thước thật của ký
            hiệu.
          </p>
        </div>
      </header>

      <SheetGallery title="Ký hiệu" samples={library} />
      <SheetGallery
        title="Kéo giãn theo thông số"
        description="Cửa và khung bao che giãn theo lỗ chờ (OP) và chiều cao (HH); cabin giãn theo chiều cao."
        samples={stretched}
      />
    </main>
  )
}
