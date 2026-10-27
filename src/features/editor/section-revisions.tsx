import { useStore } from '@tanstack/react-form'
import { toast } from 'sonner'

import { Icons } from '#/components/app/icons'
import { Button } from '#/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import type { Revision } from '#/domain/schema'
import { focusLater, useEditor } from '#/features/editor/editor-context'
import { FieldRow, TextField } from '#/features/editor/fields'
import type { FieldName } from '#/features/editor/fields'

export const EMPTY_REVISION: Revision = {
  detail: '',
  change: '',
  date: '',
  number: '',
  by: '',
  checkedBy: '',
  approvedBy: '',
  requirement: '',
}

const ADD_ID = 'revision-add'
const removeId = (i: number) => `revision-remove-${i}`

/** Lịch sử hiệu chỉnh — the 8-column revision table printed in the title block. */
export function SectionRevisions() {
  const { form, issues } = useEditor()
  const count = useStore(form.store, (s) => s.values.revisions.length)
  const notice = issues.byPath.get('revisions')?.at(0)?.message

  // Remove at once with an Undo toast (autosave would persist a mistaken delete in 1.5 s).
  const remove = (i: number) => {
    const rows = form.getFieldValue('revisions')
    const removed = rows[i]
    form.setFieldValue(
      'revisions',
      rows.filter((_row, k) => k !== i),
    )
    focusLater(removeId(Math.min(i, rows.length - 2)), ADD_ID)
    toast(`Đã xóa lần hiệu chỉnh ${i + 1}.`, {
      duration: 6000,
      action: {
        label: 'Hoàn tác',
        onClick: () =>
          form.setFieldValue('revisions', (now) => [
            ...now.slice(0, i),
            removed,
            ...now.slice(i),
          ]),
      },
    })
  }

  return (
    <div className="grid gap-3">
      {count === 0 && (
        <p className="text-(length:--text-sm) text-(--color-ink-3)">
          Chưa có lần hiệu chỉnh nào.
        </p>
      )}
      <ol className="grid gap-3">
        {Array.from({ length: count }, (_, i) => (
          <li
            key={i}
            className="grid gap-1 rounded-(--radius-control) border border-(--color-rule) p-3"
          >
            <div className="flex items-center justify-between">
              <p className="label-mono text-(--color-ink-2)">Lần {i + 1}</p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    id={removeId(i)}
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Xóa lần hiệu chỉnh ${i + 1}`}
                    onClick={() => remove(i)}
                    className="hover:text-(--color-danger)"
                  >
                    <Icons.delete aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Xóa lần hiệu chỉnh</TooltipContent>
              </Tooltip>
            </div>
            {/* Labels are the revision table's column heads on the reference sheets. */}
            <RevisionText i={i} k="detail" label="Chi tiết" />
            <RevisionText i={i} k="change" label="Hiệu chỉnh" />
            <FieldRow>
              <RevisionText i={i} k="date" label="Ngày hiệu chỉnh" />
              <RevisionText i={i} k="number" label="Lần hiệu chỉnh" />
            </FieldRow>
            <RevisionText i={i} k="by" label="Nhân viên hiệu chỉnh" />
            <FieldRow>
              <RevisionText i={i} k="checkedBy" label="Kiểm tra" />
              <RevisionText i={i} k="approvedBy" label="Duyệt" />
            </FieldRow>
            <RevisionText i={i} k="requirement" label="Yêu cầu kỹ thuật" />
          </li>
        ))}
      </ol>
      <Button
        id={ADD_ID}
        variant="outline"
        size="sm"
        className="justify-self-start"
        onClick={() =>
          form.setFieldValue('revisions', (rows) => [
            ...rows,
            { ...EMPTY_REVISION },
          ])
        }
      >
        <Icons.create aria-hidden="true" />
        Thêm lần hiệu chỉnh
      </Button>
      {notice && (
        <p className="text-(length:--text-xs) text-(--color-ink-2)">
          {/* Warn yellow marks; the ink carries the words (same as Field). */}
          <Icons.warning
            className="mr-1 inline size-4 -translate-y-px text-(--color-warn)"
            aria-hidden="true"
          />
          <span className="sr-only">Cảnh báo: </span>
          {notice}
        </p>
      )}
    </div>
  )
}

function RevisionText({
  i,
  k,
  label,
}: {
  i: number
  k: keyof Revision
  label: string
}) {
  return <TextField name={`revisions[${i}].${k}` as FieldName} label={label} />
}
