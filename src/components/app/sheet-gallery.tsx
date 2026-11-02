import * as React from 'react'

import { SheetSvg } from '#/drawing/render-svg'
import type { Prim } from '#/drawing/types'

// A titled grid of A3 sample sheets drawn through the same SheetSvg as the preview and
// the PDF: the /symbols and /primitives galleries.

export type Sample = {
  key: string
  title: string
  /** Short note under the title, e.g. "1:20 · 1186 × 3932 mm". */
  caption: string
  prims: Array<Prim>
}

export function SheetGallery({
  title,
  description,
  samples,
}: {
  title: string
  description?: string
  samples: Array<Sample>
}) {
  const id = React.useId()
  return (
    <section aria-labelledby={id} className="grid gap-4">
      <div className="grid gap-1">
        <h2
          id={id}
          className="text-(length:--text-lg) font-semibold text-(--color-ink)"
        >
          {title}
        </h2>
        {description && (
          <p className="text-(length:--text-sm) text-(--color-ink-2)">
            {description}
          </p>
        )}
      </div>
      <ul className="grid gap-4 md:grid-cols-2">
        {samples.map((s) => (
          <li
            key={s.key}
            className="grid min-w-0 gap-2 rounded-(--radius-card) border border-(--color-rule) bg-(--color-paper) p-3"
          >
            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3">
              <h3
                className="truncate text-(length:--text-sm) font-medium text-(--color-ink)"
                title={s.title}
              >
                {s.title}
              </h3>
              <p className="font-mono text-(length:--text-xs) text-(--color-ink-3) tabular-nums">
                {s.caption}
              </p>
            </div>
            <SheetSvg
              prims={s.prims}
              label={`${s.title} · ${s.caption}`}
              className="h-auto w-full rounded-sm border border-(--color-rule)"
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
