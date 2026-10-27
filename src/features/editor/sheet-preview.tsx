import * as React from 'react'

import { Skeleton } from '#/components/ui/skeleton'
import { derive } from '#/domain/derive'
import type { PageKey } from '#/domain/derive'
import type { ElevatorParams } from '#/domain/schema'
import { readyPages, renderPage } from '#/drawing/pages'
import { DRAWING_FONT } from '#/drawing/render-svg'
import { PageThumbnails } from '#/features/editor/page-thumbnails'
import type { PreviewPage } from '#/features/editor/page-thumbnails'
import { SheetViewer } from '#/features/editor/sheet-viewer'
import { cn } from '#/lib/utils'

/** Resolves once the four Tinos faces are usable, so the sheet never paints in a fallback font. */
function useDrawingFontReady(): boolean {
  const [ready, setReady] = React.useState(false)
  React.useEffect(() => {
    let alive = true
    const faces = ['400', '700', 'italic 400', 'italic 700'].map((f) =>
      document.fonts.load(`${f} 10px ${DRAWING_FONT}`),
    )
    // A failed font load still shows the sheet (fallback serif) rather than a skeleton forever.
    void Promise.allSettled(faces).then(() => {
      if (alive) setReady(true)
    })
    return () => {
      alive = false
    }
  }, [])
  return ready
}

/** The latest non-null params seen, so the sheet stays put while a field is invalid. */
export function useLastValid(
  params: ElevatorParams | null,
): ElevatorParams | null {
  const [last, setLast] = React.useState(params)
  if (params && params !== last) setLast(params)
  return params ?? last
}

/**
 * Graphite light box: page strip + zoomable sheet view. `params` is the last *valid* set
 * (`useLastValid`); `stale` says the form currently has errors, so it is not the latest.
 * Sheets are drawn from a deferred copy of the params, so typing never waits on them.
 * The selected page lives in the editor (it survives the mobile tab unmounting this).
 */
export function SheetPreview({
  params,
  stale: invalid,
  page,
  onPageChange,
  layout,
}: {
  params: ElevatorParams | null
  stale: boolean
  page: PageKey
  onPageChange: (key: PageKey) => void
  /** Desktop: thumbnails in a column; narrow screens: a row above the sheet. */
  layout: 'side' | 'stacked'
}) {
  const shown = React.useDeferredValue(params)
  const stale = invalid && params !== null
  const fontReady = useDrawingFontReady()

  const sheets = React.useMemo(() => {
    if (!shown) return null
    const d = derive(shown)
    const ready: Array<PreviewPage> = readyPages(d.pages).map((pg) => ({
      page: pg,
      prims: renderPage(shown, d, pg),
    }))
    return { ready, total: d.pages.length }
  }, [shown])
  const pages = sheets?.ready

  const index = Math.max(0, pages?.findIndex((p) => p.page.key === page) ?? 0)
  const current = pages?.[index]
  const go = (i: number) => {
    const next = pages?.[i]
    if (next) onPageChange(next.page.key)
  }

  return (
    <div
      className={cn(
        'grid h-full min-h-80 gap-3 bg-(--color-graphite) p-4 sm:p-6',
        layout === 'side'
          ? 'grid-cols-[auto_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto]'
          : 'grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto]',
      )}
    >
      {pages && current && fontReady ? (
        <>
          <div
            className={cn(
              'min-h-0 min-w-0',
              layout === 'side' && 'overflow-y-auto pr-1',
            )}
          >
            <PageThumbnails
              pages={pages}
              current={current.page.key}
              onSelect={onPageChange}
              orientation={layout === 'side' ? 'vertical' : 'horizontal'}
            />
          </div>
          <SheetViewer
            current={current}
            index={index}
            count={pages.length}
            onPrev={() => go(index - 1)}
            onNext={() => go(index + 1)}
          />
        </>
      ) : pages ? (
        <Skeleton className="col-span-full row-span-2 m-auto aspect-420/297 max-h-full w-full bg-(--color-paper)/20" />
      ) : (
        <p className="col-span-full row-span-2 grid h-full place-items-center text-center text-(length:--text-sm) text-(--color-paper)">
          Sửa các ô đang báo lỗi để xem bản vẽ.
        </p>
      )}
      <p
        className="label-mono col-span-full text-(--color-paper)"
        aria-live="polite"
      >
        {sheets &&
          `${sheets.ready.length} / ${sheets.total} trang${
            sheets.ready.length < sheets.total
              ? ` · còn ${sheets.total - sheets.ready.length} trang hình vẽ chưa làm`
              : ''
          }`}
        {stale && ' · Đang hiện bản hợp lệ gần nhất'}
      </p>
    </div>
  )
}
