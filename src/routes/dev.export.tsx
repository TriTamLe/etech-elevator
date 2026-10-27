import * as React from 'react'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { z } from 'zod'

import { PRESET_IDS, presetParams } from '#/domain/presets'
import { exportPdf } from '#/pdf/export-pdf'

// Dev-only: exports a preset to PDF for `yarn export:preset` (scripts/export-preset.ts).
// The script waits for data-state="ready" on <main>, then reads window.__pdf (base64).

declare global {
  interface Window {
    __pdf?: string
  }
}

export const Route = createFileRoute('/dev/export')({
  validateSearch: z.object({ preset: z.enum(PRESET_IDS).catch('hotel-9f') }),
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound()
  },
  ssr: false,
  component: DevExport,
})

async function blobToBase64(blob: Blob): Promise<string> {
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('FileReader'))
    reader.readAsDataURL(blob)
  })
  return url.slice(url.indexOf(',') + 1)
}

function DevExport() {
  const { preset } = Route.useSearch()
  const [state, setState] = React.useState<
    | { kind: 'running'; done: number; total: number }
    | { kind: 'ready' }
    | { kind: 'error'; message: string }
  >({ kind: 'running', done: 0, total: 0 })

  React.useEffect(() => {
    let alive = true
    window.__pdf = undefined
    exportPdf(presetParams(preset), {
      onProgress: (done, total) => {
        if (alive) setState({ kind: 'running', done, total })
      },
    })
      .then(blobToBase64)
      .then((base64) => {
        if (!alive) return
        window.__pdf = base64
        setState({ kind: 'ready' })
      })
      .catch((e: unknown) => {
        if (alive) setState({ kind: 'error', message: String(e) })
      })
    return () => {
      alive = false
    }
  }, [preset])

  return (
    <main data-state={state.kind} className="grid gap-2 p-6">
      <h1 className="text-(length:--text-xl) font-semibold">
        Xuất PDF bộ mẫu {preset} (dev)
      </h1>
      <p aria-live="polite">
        {state.kind === 'running'
          ? `Đang xuất ${state.done}/${state.total}…`
          : state.kind === 'ready'
            ? 'Xong.'
            : `Lỗi: ${state.message}`}
      </p>
    </main>
  )
}
