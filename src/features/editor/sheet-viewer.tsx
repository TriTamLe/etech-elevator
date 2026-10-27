import * as React from 'react'
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch'
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'

import { Icons } from '#/components/app/icons'
import { Button } from '#/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { SheetSvg } from '#/drawing/render-svg'
import { SHEET } from '#/drawing/types'
import { pageLabel } from '#/features/editor/page-thumbnails'
import type { PreviewPage } from '#/features/editor/page-thumbnails'

const MIN_SCALE = 0.1
const MAX_SCALE = 4
const ZOOM_STEP = 0.25
/** The sheet's CSS size at scale 1 (paper size: 96 px per inch). */
const SHEET_PX = {
  w: (SHEET.width / 25.4) * 96,
  h: (SHEET.height / 25.4) * 96,
}
/** Breathing room around a fitted sheet. */
const FIT_MARGIN = 0.96

/** Pan distance per arrow key press, in screen px. */
const PAN_STEP = 80

const TOOL_CLASS =
  'text-(--color-paper) hover:bg-(--color-paper)/10 hover:text-(--color-paper) max-sm:size-11'

/**
 * Icon button for the dark toolbar. `inactive` uses aria-disabled, not disabled, so the
 * button keeps focus at the first/last page instead of dropping it to <body>.
 */
function ToolButton({
  label,
  onClick,
  inactive,
  children,
}: {
  label: string
  onClick: () => void
  inactive?: boolean
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          aria-disabled={inactive || undefined}
          onClick={() => {
            if (!inactive) onClick()
          }}
          className={TOOL_CLASS}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * Main sheet view: fits the page on open, on every page change and whenever the viewport
 * resizes (until the user zooms); zoom with the toolbar,
 * Ctrl/⌘ + wheel or a pinch, drag to pan. Scale 1 = paper size ("100 %").
 */
export function SheetViewer({
  current,
  index,
  count,
  onPrev,
  onNext,
}: {
  current: PreviewPage
  index: number
  count: number
  onPrev: () => void
  onNext: () => void
}) {
  const ref = React.useRef<ReactZoomPanPinchRef>(null)
  const viewportRef = React.useRef<HTMLDivElement>(null)
  const [scale, setScale] = React.useState<number | null>(null)
  // While true the page follows the viewport size (toolbar wrapping, rotating a phone,
  // resizing the window); any manual zoom turns it off until "Vừa khung" again.
  const fitted = React.useRef(true)
  const label = pageLabel(current.page)

  /**
   * Whole sheet centred in the viewport. Computed here from the viewport box and the paper
   * size: the library's fit misreads a viewport that is still settling its size.
   */
  const fitView = React.useCallback((animationTime: number) => {
    const vp = viewportRef.current
    if (!vp || !ref.current) return
    const { width, height } = vp.getBoundingClientRect()
    if (width === 0 || height === 0) return
    const s = Math.min(
      MAX_SCALE,
      Math.max(
        MIN_SCALE,
        Math.min(width / SHEET_PX.w, height / SHEET_PX.h) * FIT_MARGIN,
      ),
    )
    void ref.current.setTransform(
      (width - SHEET_PX.w * s) / 2,
      (height - SHEET_PX.h * s) / 2,
      s,
      animationTime,
    )
  }, [])

  React.useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      if (fitted.current) fitView(0)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [fitView])

  // Every page opens fitted, whatever the previous one was zoomed to.
  const pageKey = current.page.key
  React.useEffect(() => {
    fitted.current = true
    fitView(0)
  }, [pageKey, fitView])

  const fit = () => {
    fitted.current = true
    fitView(200)
  }
  const manual = (zoom: () => void) => () => {
    fitted.current = false
    zoom()
  }

  const initFrame = React.useRef(0)
  React.useEffect(() => () => cancelAnimationFrame(initFrame.current), [])

  const onPanKey = (e: React.KeyboardEvent) => {
    const d: Partial<Record<string, [number, number]>> = {
      ArrowLeft: [PAN_STEP, 0],
      ArrowRight: [-PAN_STEP, 0],
      ArrowUp: [0, PAN_STEP],
      ArrowDown: [0, -PAN_STEP],
    }
    const step = d[e.key]
    if (!step) return
    e.preventDefault()
    void ref.current?.panBy(step[0], step[1], 100)
  }

  return (
    <div className="grid min-h-0 min-w-0 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] gap-2">
      <div
        role="group"
        aria-label="Xem trang"
        className="flex flex-wrap items-center gap-1 text-(--color-paper)"
      >
        <ToolButton label="Trang trước" onClick={onPrev} inactive={index === 0}>
          <Icons.prevPage aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label="Trang sau"
          onClick={onNext}
          inactive={index === count - 1}
        >
          <Icons.nextPage aria-hidden="true" />
        </ToolButton>
        <p className="label-mono mr-auto px-1" aria-live="polite">
          Trang {index + 1} / {count}
          <span className="sr-only"> · {label}</span>
        </p>
        <ToolButton
          label="Thu nhỏ"
          onClick={manual(() => void ref.current?.zoomOut(ZOOM_STEP))}
        >
          <Icons.zoomOut aria-hidden="true" />
        </ToolButton>
        <p className="label-mono w-12 text-center">
          <span className="sr-only">Mức phóng </span>
          {scale === null ? '—' : `${Math.round(scale * 100)} %`}
        </p>
        <ToolButton
          label="Phóng to"
          onClick={manual(() => void ref.current?.zoomIn(ZOOM_STEP))}
        >
          <Icons.zoomIn aria-hidden="true" />
        </ToolButton>
        <ToolButton label="Vừa khung" onClick={fit}>
          <Icons.fit aria-hidden="true" />
        </ToolButton>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              aria-label="1:1 · Cỡ thật 100 %"
              onClick={manual(() => void ref.current?.centerView(1))}
              className={`label-mono ${TOOL_CLASS} max-sm:h-11 max-sm:w-auto`}
            >
              1:1
            </Button>
          </TooltipTrigger>
          <TooltipContent>Cỡ thật (100 %)</TooltipContent>
        </Tooltip>
      </div>

      {/* Focusable so a keyboard can pan a zoomed sheet with the arrow keys. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- keyboard pan surface (arrow keys) */}
      <div
        ref={viewportRef}
        role="region"
        aria-label={`Bản vẽ ${label} · phím mũi tên để di chuyển`}
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- must take focus to receive the arrow keys
        tabIndex={0}
        onKeyDown={onPanKey}
        className="min-h-0 min-w-0 overflow-hidden rounded-sm outline-offset-2 focus-visible:outline-2 focus-visible:outline-(--color-paper)"
      >
        <TransformWrapper
          ref={ref}
          minScale={MIN_SCALE}
          maxScale={MAX_SCALE}
          limitToBounds={false}
          wheel={{ activationKeys: ['Control', 'Meta'], step: 0.1 }}
          doubleClick={{ disabled: true }}
          onInit={() => {
            initFrame.current = requestAnimationFrame(() => {
              if (fitted.current) fitView(0)
            })
          }}
          onZoomStart={() => {
            fitted.current = false
          }}
          onPinchStart={() => {
            fitted.current = false
          }}
          onTransform={(_r, s) => setScale(s.scale)}
        >
          <TransformComponent wrapperClass="!size-full">
            <SheetSvg prims={current.prims} label={label} className="block" />
          </TransformComponent>
        </TransformWrapper>
      </div>
    </div>
  )
}
