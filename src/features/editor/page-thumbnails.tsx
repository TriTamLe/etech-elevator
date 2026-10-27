import * as React from 'react'

import type { Page, PageKey } from '#/domain/derive'
import { SheetSvg } from '#/drawing/render-svg'
import type { Prim } from '#/drawing/types'
import { cn } from '#/lib/utils'

export type PreviewPage = { page: Page; prims: ReadonlyArray<Prim> }

/** "Bìa" / "DTP 01 · Hạng mục trách nhiệm" — the page's name everywhere in the preview. */
export function pageLabel(page: Page): string {
  return page.code ? `${page.code} · ${page.title}` : 'Bìa'
}

/**
 * Page strip: a column beside the viewer on desktop, a scrolling row above it on narrow
 * screens. Each thumbnail is a real button; arrow keys move between them (and select).
 */
export function PageThumbnails({
  pages,
  current,
  onSelect,
  orientation,
}: {
  pages: ReadonlyArray<PreviewPage>
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
    const i = pages.findIndex((p) => p.page.key === current)
    const next = pages[i + (e.key === nextKey ? 1 : -1)] as
      PreviewPage | undefined
    if (!next) return
    onSelect(next.page.key)
    listRef.current
      ?.querySelector<HTMLButtonElement>(`[data-page="${next.page.key}"]`)
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
        {pages.map(({ page, prims }) => {
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
                  <SheetSvg
                    prims={prims}
                    label={null}
                    className="block h-auto w-full"
                  />
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
}
