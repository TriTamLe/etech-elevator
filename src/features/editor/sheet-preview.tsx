import * as React from 'react'

import { Skeleton } from '#/components/ui/skeleton'
import { derive } from '#/domain/derive'
import type { Page, PageKey } from '#/domain/derive'
import type { ElevatorParams } from '#/domain/schema'
import { readyPages, renderPage } from '#/drawing/pages'
import { DRAWING_FONT } from '#/drawing/render-svg'
import { PageThumbnails } from '#/features/editor/page-thumbnails'
import type {
  PreviewPage,
  ThumbSource,
} from '#/features/editor/page-thumbnails'
import { SheetViewer } from '#/features/editor/sheet-viewer'
import { useDebouncedValue } from '#/lib/use-debounced-value'
import { cn } from '#/lib/utils'

const THUMBS_DELAY_MS = 300

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

/** `pages`, as the same array while no key, code or title changes (keeps the strip memo). */
function useStablePages(pages: Array<Page> | null): Array<Page> | null {
  const signature = pages
    ?.map((p) => `${p.key}\u0000${p.code}\u0000${p.title}`)
    .join('\u0001')
  // Keyed by content, not identity: a new array with the same pages is the old one.
  return React.useMemo(() => pages, [signature])
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

  // The sheet on screen follows every keystroke (deferred). Thumbnail drawings follow
  // once typing pauses, each thumbnail redrawing in its own idle callback. The strip's
  // buttons (keys, codes, labels) always come from the current page list, so they never
  // disagree with the sheet on screen.
  const d = React.useMemo(() => (shown ? derive(shown) : null), [shown])
  const pages = React.useMemo(() => (d ? readyPages(d.pages) : null), [d])
  const index = Math.max(0, pages?.findIndex((p) => p.key === page) ?? 0)
  const currentPage = pages?.[index]
  const current = React.useMemo<PreviewPage | undefined>(
    () =>
      shown && d && currentPage
        ? { page: currentPage, prims: renderPage(shown, d, currentPage) }
        : undefined,
    [shown, d, currentPage],
  )
  const thumbParams = useDebouncedValue(shown, THUMBS_DELAY_MS)
  const strip = useStablePages(pages)
  const thumbSource = React.useMemo<ThumbSource | null>(
    () =>
      thumbParams ? { params: thumbParams, d: derive(thumbParams) } : null,
    [thumbParams],
  )
  const sheets =
    d && pages ? { ready: pages.length, total: d.pages.length } : null

  const go = (i: number) => {
    const next = pages?.[i]
    if (next) onPageChange(next.key)
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
              pages={strip ?? pages}
              source={thumbSource}
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
          `${sheets.ready} / ${sheets.total} trang${
            sheets.ready < sheets.total
              ? ` · còn ${sheets.total - sheets.ready} trang hình vẽ chưa làm`
              : ''
          }`}
        {stale && ' · Đang hiện bản hợp lệ gần nhất'}
      </p>
    </div>
  )
}
