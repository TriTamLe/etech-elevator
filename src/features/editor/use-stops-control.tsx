import * as React from 'react'
import { useStore } from '@tanstack/react-form'

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
import { focusLater, useEditor } from '#/features/editor/editor-context'
import { resizeFloors, wouldDropEdited } from '#/features/editor/floors'

export const MIN_STOPS = 2
export const MAX_STOPS = 60

type Request = {
  to: number
  /** Element to focus once the confirmation closes (its opener). */
  returnFocusId: string
  onCancel?: () => void
}

type Pending = Request & { from: number }

/**
 * The one way to change the stop count (section B's field and section D's add/remove
 * buttons): resizes the floor list with it, and asks first when rows the user edited
 * would be dropped. Render `dialog` once next to the control.
 */
export function useStopsControl() {
  const { form } = useEditor()
  const stops = useStore(form.store, (s) => s.values.tech.stops)
  // `pending` outlives `open` until the close animation and focus return are done, so the
  // dialog text never blanks while it fades and onCloseAutoFocus knows the opener.
  const [pending, setPending] = React.useState<Pending | null>(null)
  const [open, setOpen] = React.useState(false)
  const confirmed = React.useRef(false)

  const apply = (n: number) => {
    form.setFieldValue('tech.stops', n)
    form.setFieldValue('floors', (floors) => resizeFloors(floors, n))
  }

  /** Change to `req.to` stops; returns false when it is waiting for confirmation. */
  const request = (req: Request): boolean => {
    const floors = form.getFieldValue('floors')
    // Same count but a mismatched list (e.g. imported JSON): resizing fixes the list.
    if (req.to === stops && floors.length === req.to) return true
    if (wouldDropEdited(floors, req.to)) {
      confirmed.current = false
      setPending({ ...req, from: stops })
      setOpen(true)
      return false
    }
    apply(req.to)
    return true
  }

  const dialog = (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (next) return
        // Radix also closes through here after the Action's onClick: only a real
        // cancel (button, Esc) runs onCancel.
        if (!confirmed.current) pending?.onCancel?.()
        setOpen(false)
      }}
    >
      <AlertDialogContent
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          if (pending) focusLater(pending.returnFocusId)
          setPending(null)
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Bỏ bớt tầng đã sửa?</AlertDialogTitle>
          <AlertDialogDescription>
            Giảm từ {pending?.from} xuống {pending?.to} điểm dừng sẽ xóa các
            tầng phía trên, trong đó có tầng đã nhập chiều cao hoặc đổi bao che.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Giữ {pending?.from} tầng</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              confirmed.current = true
              if (pending) apply(pending.to)
            }}
          >
            Giảm còn {pending?.to} tầng
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return { stops, request, dialog }
}
