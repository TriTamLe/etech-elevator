import * as React from 'react'

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
import { useDeleteProject } from '#/features/projects/queries'
import type { ProjectListItem } from '#/server/project-repo'

// Asks before deleting. The delete stays soft + optimistic, and its toast still offers Undo.
export function DeleteProjectDialog({
  project,
  onClose,
  onDeleted,
  onCancelled,
}: {
  project: ProjectListItem | null
  onClose: () => void
  /** Move focus after the row is gone (its trigger no longer exists). */
  onDeleted: () => void
  onCancelled: (id: string) => void
}) {
  const remove = useDeleteProject()
  // Kept after close so onCloseAutoFocus still knows which row and outcome it was.
  const last = React.useRef<{ id: string; deleted: boolean } | null>(null)
  // The text stays on screen during the close animation, after `project` is null.
  const [shownName, setShownName] = React.useState('')
  if (project && project.name !== shownName) setShownName(project.name)

  return (
    <AlertDialog open={project !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent
        onOpenAutoFocus={() => {
          if (project) last.current = { id: project.id, deleted: false }
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          const done = last.current
          if (!done) return
          if (done.deleted) onDeleted()
          else onCancelled(done.id)
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa dự án?</AlertDialogTitle>
          <AlertDialogDescription>
            “{shownName}” sẽ bị xóa khỏi danh sách. Bạn có thể hoàn tác ngay
            sau khi xóa.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (!project) return
              last.current = { id: project.id, deleted: true }
              remove.mutate({ id: project.id, name: project.name })
            }}
          >
            Xóa dự án
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
