import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Icons } from '#/components/app/icons'
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
import { Field } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { Skeleton } from '#/components/ui/skeleton'
import {
  HEADER_IDS,
  focusLater,
  useEditor,
} from '#/features/editor/editor-context'
import { EMPTY_REVISION } from '#/features/editor/section-revisions'
import {
  errorMessage,
  fetchVersion,
  useSaveVersion,
  versionsQuery,
} from '#/features/projects/queries'
import { formatDate, formatUpdatedAt } from '#/lib/format'
import type { VersionListItem } from '#/server/project-repo'

/** Versions: snapshot with a note, restore into the form, or log one in the revision table. */
export function VersionsSheet({
  projectId,
  open,
  onOpenChange,
  flush,
}: {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Save pending edits first: the server snapshots what D1 holds. */
  flush: () => Promise<boolean>
}) {
  const { form, replaceParams } = useEditor()
  const versions = useQuery({ ...versionsQuery(projectId), enabled: open })
  const saveVersion = useSaveVersion(projectId)
  const [note, setNote] = React.useState('')
  const [restoring, setRestoring] = React.useState<VersionListItem | null>(null)
  const lastRestoreId = React.useRef<string | null>(null)
  if (restoring) lastRestoreId.current = restoring.id
  const [busy, setBusy] = React.useState(false)
  const now = new Date()

  const snapshot = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (!(await flush())) {
        toast.error(
          'Còn lỗi trong form hoặc chưa lưu được — sửa xong rồi lưu phiên bản.',
        )
        return
      }
      await saveVersion.mutateAsync(note.trim() || null)
      setNote('')
      toast.success('Đã lưu phiên bản.')
    } catch {
      // useSaveVersion's onError already shows the toast.
    } finally {
      setBusy(false)
    }
  }

  const [restoreBusy, setRestoreBusy] = React.useState(false)
  // The confirmation stays open (button loading) until the version has been fetched.
  const restore = async (v: VersionListItem) => {
    setRestoreBusy(true)
    try {
      const version = await fetchVersion(projectId, v.id)
      replaceParams(version.params)
      toast.success(
        `Đã khôi phục phiên bản ${formatUpdatedAt(v.createdAt, now)}.`,
      )
      setRestoring(null)
      onOpenChange(false)
    } catch (err) {
      toast.error(`Không khôi phục được: ${errorMessage(err)}`)
    } finally {
      setRestoreBusy(false)
    }
  }

  const logRevision = (v: VersionListItem) => {
    form.setFieldValue('revisions', (rows) => [
      ...rows,
      {
        ...EMPTY_REVISION,
        number: String(rows.length + 1),
        date: formatDate(v.createdAt),
        change: v.note ?? '',
      },
    ])
    toast.success('Đã thêm vào bảng hiệu chỉnh.')
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          focusLater(HEADER_IDS.versions)
        }}
      >
        <SheetHeader>
          <SheetTitle>Phiên bản</SheetTitle>
          <SheetDescription>
            Chụp lại thông số hiện tại để khôi phục hoặc ghi vào bảng hiệu
            chỉnh.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={snapshot}
          className="grid gap-2 border-b border-(--color-rule) px-5 py-4"
        >
          <Field label="Ghi chú" hint="Ví dụ: Gửi khách duyệt lần 1">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
            />
          </Field>
          <Button type="submit" loading={busy} className="justify-self-start">
            <Icons.versions aria-hidden="true" />
            Lưu phiên bản
          </Button>
        </form>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {versions.isPending ? (
            <div className="grid gap-3" aria-label="Đang tải phiên bản">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : versions.isError ? (
            <p className="text-(length:--text-sm) text-(--color-danger)">
              Không tải được danh sách phiên bản: {errorMessage(versions.error)}
            </p>
          ) : versions.data.length === 0 ? (
            <p className="text-(length:--text-sm) text-(--color-ink-3)">
              Chưa có phiên bản nào.
            </p>
          ) : (
            <ol className="grid gap-3">
              {versions.data.map((v) => (
                <li
                  key={v.id}
                  className="grid gap-2 rounded-(--radius-control) border border-(--color-rule) p-3"
                >
                  <p className="label-mono text-(--color-ink-3)">
                    {formatUpdatedAt(v.createdAt, now)}
                  </p>
                  <p className="text-(length:--text-sm) text-pretty text-(--color-ink)">
                    {v.note ?? (
                      <span className="text-(--color-ink-3)">
                        Không có ghi chú
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      id={`version-restore-${v.id}`}
                      variant="outline"
                      size="sm"
                      onClick={() => setRestoring(v)}
                    >
                      <Icons.restore aria-hidden="true" />
                      Khôi phục
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => logRevision(v)}
                    >
                      <Icons.create aria-hidden="true" />
                      Đưa vào bảng hiệu chỉnh
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </SheetContent>

      <AlertDialog
        open={restoring !== null}
        onOpenChange={(o) => !o && !restoreBusy && setRestoring(null)}
      >
        <AlertDialogContent
          onCloseAutoFocus={(e) => {
            // Cancelled: back to that version's button (the sheet is still open).
            e.preventDefault()
            if (lastRestoreId.current) {
              focusLater(
                `version-restore-${lastRestoreId.current}`,
                HEADER_IDS.versions,
              )
            }
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Khôi phục phiên bản này?</AlertDialogTitle>
            <AlertDialogDescription>
              Toàn bộ thông số hiện tại sẽ được thay bằng phiên bản{' '}
              {restoring ? formatUpdatedAt(restoring.createdAt, now) : ''}. Nên
              lưu một phiên bản của bản hiện tại trước nếu muốn giữ lại.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              variant="default"
              aria-busy={restoreBusy || undefined}
              onClick={(e) => {
                e.preventDefault()
                if (restoring && !restoreBusy) void restore(restoring)
              }}
            >
              {restoreBusy ? 'Đang khôi phục…' : 'Khôi phục'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  )
}
