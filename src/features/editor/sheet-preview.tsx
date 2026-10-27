import * as React from 'react'

import { Skeleton } from '#/components/ui/skeleton'
import { derive } from '#/domain/derive'
import type { ElevatorParams } from '#/domain/schema'
import { renderPage } from '#/drawing/pages'
import { DRAWING_FONT, SheetSvg } from '#/drawing/render-svg'

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
 * Graphite light box with the live cover sheet (P5a). `params` is the last *valid* set
 * (`useLastValid`); `stale` says the form currently has errors, so it is not the latest.
 */
export function SheetPreview({
  params: shown,
  stale: invalid,
}: {
  params: ElevatorParams | null
  stale: boolean
}) {
  const stale = invalid && shown !== null

  const fontReady = useDrawingFontReady()
  const prims = React.useMemo(() => {
    if (!shown) return null
    const d = derive(shown)
    return renderPage(shown, d, d.pages[0])
  }, [shown])

  return (
    <div className="grid h-full min-h-80 grid-rows-[minmax(0,1fr)_auto] gap-3 bg-(--color-graphite) p-4 sm:p-6">
      <div className="relative min-h-0">
        {prims && fontReady ? (
          <SheetSvg prims={prims} label="Bìa" className="size-full" />
        ) : prims ? (
          <Skeleton className="absolute inset-0 m-auto aspect-420/297 max-h-full w-full bg-(--color-paper)/20" />
        ) : (
          <p className="grid h-full place-items-center text-center text-(length:--text-sm) text-(--color-paper)">
            Sửa các ô đang báo lỗi để xem bản vẽ.
          </p>
        )}
      </div>
      <p className="label-mono text-(--color-paper)" aria-live="polite">
        Bìa · A3 · 420 × 297
        {stale && ' · Đang hiện bản hợp lệ gần nhất'}
      </p>
    </div>
  )
}
