import * as React from 'react'

import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Field } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { PROJECT_TEXT_MAX } from '#/domain/config'
import { useUpdateProjectInfo } from '#/features/projects/queries'
import type { ProjectListItem } from '#/server/project-repo'

// Edit the list-level info (name + address) on every screen size; no inline editing.
export function EditProjectDialog({
  project,
  onClose,
  onRestoreFocus,
}: {
  project: ProjectListItem | null
  onClose: () => void
  /** Where focus goes once the dialog has closed (the row may have moved or its trigger gone). */
  onRestoreFocus: (id: string) => void
}) {
  // Last opened project: keeps the form on screen through the close animation
  // and tells onCloseAutoFocus which row to return to.
  const [shown, setShown] = React.useState<ProjectListItem | null>(null)
  if (project && project !== shown) setShown(project)

  return (
    <Dialog open={project !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          if (shown) onRestoreFocus(shown.id)
        }}
      >
        {shown && <EditForm key={shown.id} project={shown} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

/** Keyed by project id, so its fields start from that project without a sync effect. */
function EditForm({
  project,
  onDone,
}: {
  project: ProjectListItem
  onDone: () => void
}) {
  const update = useUpdateProjectInfo()
  const [name, setName] = React.useState(project.name)
  const [address, setAddress] = React.useState(project.address)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const next = { name: name.trim(), address: address.trim() }
    if (!next.name) return
    if (next.name !== project.name || next.address !== project.address) {
      update.mutate({ id: project.id, ...next })
    }
    onDone()
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Sửa thông tin dự án</DialogTitle>
        <DialogDescription>Thông số kỹ thuật sửa trong màn soạn.</DialogDescription>
      </DialogHeader>
      <Field
        label="Tên công trình"
        required
        error={name.trim() ? undefined : 'Tên không được để trống.'}
      >
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={PROJECT_TEXT_MAX.name}
        />
      </Field>
      <Field label="Địa chỉ" hint="Ví dụ: 12 Lê Lợi, Hải Châu, Đà Nẵng">
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          maxLength={PROJECT_TEXT_MAX.address}
        />
      </Field>
      <DialogFooter>
        <Button type="submit" disabled={!name.trim()}>
          Lưu
        </Button>
      </DialogFooter>
    </form>
  )
}
