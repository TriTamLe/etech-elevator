import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'

import { BrandMark } from '#/components/app/brand-mark'
import { Icons } from '#/components/app/icons'
import { SaveStatus } from '#/components/app/save-status'
import type { SaveState } from '#/components/app/save-status'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { Button } from '#/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { migrateImport } from '#/domain/migrate'
import type { ElevatorParams } from '#/domain/schema'
import {
  HEADER_IDS,
  focusLater,
  useEditor,
} from '#/features/editor/editor-context'
import {
  downloadParamsJson,
  readJsonFile,
} from '#/features/projects/project-json'
import { useExportPdf } from '#/features/editor/use-export-pdf'
import { errorMessage } from '#/features/projects/queries'

export function EditorHeader({
  name,
  save,
  onOpenVersions,
}: {
  name: string
  save: SaveState
  onOpenVersions: () => void
}) {
  const { issues, replaceParams } = useEditor()
  const fileInput = React.useRef<HTMLInputElement>(null)
  const [imported, setImported] = React.useState<ElevatorParams | null>(null)

  const exportJson = () => {
    if (!issues.params) {
      toast.error('Còn lỗi trong form — sửa xong rồi xuất JSON.')
      return
    }
    downloadParamsJson(issues.params)
  }

  const onFile = async (file: File) => {
    try {
      setImported(migrateImport(await readJsonFile(file)))
    } catch (e) {
      toast.error(`Không nhập được: ${errorMessage(e)}`)
    }
  }

  // Rule errors block the PDF; warnings do not. Zod errors leave params null.
  const pdfReady = issues.errors === 0 ? issues.params : null
  const pdfBlockedBy = `Còn ${issues.errors} lỗi cần sửa trước khi xuất PDF.`
  const pdf = useExportPdf(pdfReady, pdfBlockedBy)
  const pdfStatus = !pdf.progress
    ? null
    : pdf.progress.total === 0
      ? 'Đang chuẩn bị…'
      : `Đang xuất ${pdf.progress.done}/${pdf.progress.total}…`

  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-(--color-rule) bg-(--color-paper) px-4 py-2.5 sm:px-6">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" asChild>
            <Link to="/" id={HEADER_IDS.back} aria-label="Về danh sách dự án">
              <Icons.back aria-hidden="true" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Danh sách dự án</TooltipContent>
      </Tooltip>
      <BrandMark className="h-6 max-sm:hidden" />
      <div className="grid min-w-0 flex-1 basis-40">
        <h1
          className="truncate text-(length:--text-base) font-semibold text-(--color-ink)"
          title={name}
        >
          {name || 'Chưa đặt tên'}
        </h1>
        <SaveStatus state={save} />
      </div>

      <div className="flex items-center gap-1.5">
        <HeaderButton
          id={HEADER_IDS.versions}
          label="Phiên bản"
          onClick={onOpenVersions}
          icon={<Icons.versions aria-hidden="true" />}
        />
        <HeaderButton
          label="Xuất JSON"
          onClick={exportJson}
          icon={<Icons.exportJson aria-hidden="true" />}
        />
        <HeaderButton
          id={HEADER_IDS.importJson}
          label="Nhập JSON"
          onClick={() => fileInput.current?.click()}
          icon={<Icons.importJson aria-hidden="true" />}
        />
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void onFile(file)
          }}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            {/* aria-disabled (not disabled) keeps it focusable: the reason stays reachable
                while blocked, and focus stays put while exporting. */}
            <Button
              aria-disabled={!pdfReady || pdfStatus !== null || undefined}
              aria-busy={pdfStatus !== null || undefined}
              aria-label={pdfReady ? undefined : `Tải PDF — ${pdfBlockedBy}`}
              onClick={() => void pdf.run()}
            >
              {pdfStatus ? (
                <Icons.loading
                  className="motion-safe:animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Icons.downloadPdf aria-hidden="true" />
              )}
              {/* While exporting the name stays "Tải PDF"; the progress is announced once,
                  by the live region below, not again as the focused button's name. */}
              {pdfStatus ? (
                <>
                  <span className="sr-only">Tải PDF</span>
                  <span className="max-sm:hidden" aria-hidden="true">
                    {pdfStatus}
                  </span>
                </>
              ) : (
                <span className="max-sm:sr-only">Tải PDF</span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {pdfReady ? (pdfStatus ?? 'Tải bộ bản vẽ PDF (A3)') : pdfBlockedBy}
          </TooltipContent>
        </Tooltip>
        <span className="sr-only" aria-live="polite">
          {pdfStatus}
        </span>
      </div>

      <AlertDialog
        open={imported !== null}
        onOpenChange={(o) => !o && setImported(null)}
      >
        <AlertDialogContent
          onCloseAutoFocus={(e) => {
            e.preventDefault()
            focusLater(HEADER_IDS.importJson)
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Thay toàn bộ thông số?</AlertDialogTitle>
            <AlertDialogDescription>
              Thông số của “{imported?.project.name}” trong file sẽ thay cho
              thông số hiện tại của dự án này. Nên lưu một phiên bản trước nếu
              muốn giữ lại bản hiện tại.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              variant="default"
              onClick={() => {
                if (imported) replaceParams(imported)
                toast.success('Đã nhập thông số từ file.')
              }}
            >
              Thay thông số
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  )
}

/** Outline button with its label from 640 px, icon + tooltip below. */
function HeaderButton({
  id,
  label,
  icon,
  onClick,
}: {
  id?: string
  label: string
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          id={id}
          variant="outline"
          onClick={onClick}
          aria-label={label}
          className="max-sm:size-(--control-h) max-sm:px-0"
        >
          {icon}
          <span className="max-sm:hidden">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent className="sm:hidden">{label}</TooltipContent>
    </Tooltip>
  )
}
