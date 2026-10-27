import * as React from 'react'
import { toast } from 'sonner'

import type { ElevatorParams } from '#/domain/schema'
import { downloadBlob } from '#/lib/download'
import { ExportError } from '#/pdf/export-error'
import { pdfFileName } from '#/pdf/file-name'

export type ExportState = { done: number; total: number } | null

/**
 * "Tải PDF": exports `ready` (the form's current params, or null while errors block the
 * PDF) and downloads it. `progress` is non-null while an export runs; a second click
 * meanwhile is ignored. A failure toasts with "Thử lại", which exports the params of
 * that moment, not the ones that failed.
 */
export function useExportPdf(ready: ElevatorParams | null, blockedBy: string) {
  const [progress, setProgress] = React.useState<ExportState>(null)
  const busy = React.useRef(false)
  const latest = React.useRef({ ready, blockedBy })
  React.useEffect(() => {
    latest.current = { ready, blockedBy }
  }, [ready, blockedBy])

  const run = React.useCallback(async () => {
    if (busy.current) return
    const params = latest.current.ready
    if (!params) {
      toast(latest.current.blockedBy)
      return
    }
    busy.current = true
    setProgress({ done: 0, total: 0 })
    try {
      const { exportPdf } = await import('#/pdf/export-pdf')
      const blob = await exportPdf(params, {
        onProgress: (done, total) => setProgress({ done, total }),
      })
      downloadBlob(blob, pdfFileName(params.project.name, new Date()))
    } catch (e) {
      // Library/browser errors are English and technical: log them, show a generic line.
      if (!(e instanceof ExportError)) console.error(e)
      const reason =
        e instanceof ExportError
          ? e.message
          : 'Đã có lỗi — kiểm tra mạng rồi thử lại.'
      toast.error(`Không xuất được PDF. ${reason}`, {
        action: { label: 'Thử lại', onClick: () => void run() },
      })
    } finally {
      busy.current = false
      setProgress(null)
    }
  }, [])

  return { progress, run }
}
