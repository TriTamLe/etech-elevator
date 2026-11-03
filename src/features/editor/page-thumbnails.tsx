import * as React from 'react'

import type { Derived, Page, PageKey } from '#/domain/derive'
import type { ElevatorParams } from '#/domain/schema'
import { renderPage } from '#/drawing/pages'
import { SheetSvg } from '#/drawing/render-svg'
import type { Prim } from '#/drawing/types'
import { cn } from '#/lib/utils'
import { whenIdle } from '#/lib/when-idle'

export type PreviewPage = { page: Page; prims: ReadonlyArray<Prim> }

/** "Bìa" / "DTP 01 · Hạng mục trách nhiệm" — the page's name everywhere in the preview. */
export function pageLabel(page: Page): string {
  return page.code ? `${page.code} · ${page.title}` : 'Bìa'
}

/** The params (and their derive) thumbnails are drawn from: lag behind typing. */
export type ThumbSource = { params: ElevatorParams; d: Derived }

/**
 * One thumbnail's drawing. It redraws in an idle callback of its own, so a strip update
 * is nine small renders the next keystroke can slip between, not one long one. Until
 * then (and for a page the source does not have yet) it keeps its last drawing.
 */
const ThumbSvg = React.memo(function ThumbSvg({
  source,
  pageKey,
}: {
  source: ThumbSource | null
  pageKey: PageKey
}) {
  const [prims, setPrims] = React.useState<ReadonlyArray<Prim> | null>(null)
  React.useEffect(() => {
    const pg = source?.d.pages.find((x) => x.key === pageKey)
    if (!source || !pg) return
    return whenIdle(() => setPrims(renderPage(source.params, source.d, pg)))
  }, [source, pageKey])
  return prims ? (
    <SheetSvg prims={prims} label={null} className="block h-auto w-full" />
  ) : (
    <span className="block aspect-420/297 w-full bg-(--color-paper)/20" />
  )
})

/**
 * Page strip: a column beside the viewer on desktop, a scrolling row above it on narrow
 * screens. Each thumbnail is a real button; arrow keys move between them (and select).
 * Memoised; its drawings come from `source`, which lags behind typing.
 */
export const PageThumbnails = React.memo(function PageThumbnails({
  pages,
  source,
  current,
  onSelect,
  orientation,
}: {
  pages: ReadonlyArray<Page>
  source: ThumbSource | null
  current: PageKey
  onSelect: (key: PageKey) => void
  orientation: 'vertical' | 'horizontal'
}) {
  const listRef = React.useRef<HTMLOListElement>(null)
  // Keep the selected thumbnail visible (the narrow-screen strip scrolls sideways).
  React.useEffect(() => {
    listRef.current
      ?.querySelector(`[data-page="${current}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [current])
  const prevKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft'
  const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight'

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== prevKey && e.key !== nextKey) return
    e.preventDefault()
    const i = pages.findIndex((p) => p.key === current)
    const next = pages[i + (e.key === nextKey ? 1 : -1)] as Page | undefined
    if (!next) return
    onSelect(next.key)
    listRef.current
      ?.querySelector<HTMLButtonElement>(`[data-page="${next.key}"]`)
      ?.focus()
  }

  return (
    <nav aria-label="Các trang">
      <ol
        ref={listRef}
        className={cn(
          'flex gap-3',
          orientation === 'vertical'
            ? 'flex-col'
            : 'overflow-x-auto overscroll-x-contain pb-1',
        )}
      >
        {pages.map((page) => {
          const active = page.key === current
          return (
            <li key={page.key} className="shrink-0">
              <button
                type="button"
                data-page={page.key}
                aria-current={active ? 'page' : undefined}
                aria-label={pageLabel(page)}
                onClick={() => onSelect(page.key)}
                onKeyDown={onKeyDown}
                className={cn(
                  'grid w-28 gap-1 rounded-(--radius-control) p-1 text-left outline-offset-2 transition-colors',
                  'hover:bg-(--color-paper)/10 focus-visible:outline-2 focus-visible:outline-(--color-paper)',
                  active && 'bg-(--color-paper)/15',
                )}
              >
                <span
                  className={cn(
                    'block overflow-hidden rounded-sm border-2',
                    active ? 'border-(--color-accent)' : 'border-transparent',
                  )}
                >
                  <ThumbSvg source={source} pageKey={page.key} />
                </span>
                <span className="label-mono truncate text-(--color-paper)">
                  {page.code || 'Bìa'}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
})
