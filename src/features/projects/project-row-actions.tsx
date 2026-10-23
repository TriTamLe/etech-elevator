import * as React from 'react'
import { toast } from 'sonner'

import { Icons } from '#/components/app/icons'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { exportProjectJson } from '#/features/projects/project-json'
import { errorMessage, useDuplicateProject } from '#/features/projects/queries'
import { cn } from '#/lib/utils'
import type { ProjectListItem } from '#/server/project-repo'

// Row actions, one list for both layouts: icon buttons with tooltips ≥ 640 px,
// a "⋯" menu below. Opening a project is the name link itself.

type RowActionProps = {
  project: ProjectListItem
  disabled: boolean
  onEdit: () => void
  /** Opens the delete confirmation. */
  onDelete: () => void
}

type RowAction = {
  key: string
  label: string
  icon: (typeof Icons)[keyof typeof Icons]
  run: () => void
  destructive?: boolean
  /** The action moves focus itself (dialog, removed row). */
  movesFocus?: boolean
}

function useRowActions({
  project,
  onEdit,
  onDelete,
}: RowActionProps): Array<RowAction> {
  const duplicate = useDuplicateProject()
  return [
    {
      key: 'duplicate',
      label: 'Nhân bản',
      icon: Icons.duplicate,
      run: () => duplicate.mutate({ id: project.id }),
    },
    {
      key: 'edit',
      label: 'Sửa tên & địa chỉ',
      icon: Icons.edit,
      run: onEdit,
      movesFocus: true,
    },
    {
      key: 'export',
      label: 'Xuất JSON',
      icon: Icons.exportJson,
      run: () =>
        void exportProjectJson(project.id).catch((e: unknown) =>
          toast.error(`Không xuất được JSON: ${errorMessage(e)}`),
        ),
    },
    {
      key: 'delete',
      label: 'Xóa',
      icon: Icons.delete,
      destructive: true,
      movesFocus: true,
      run: onDelete,
    },
  ]
}

/** ≥ 640 px: every action visible as an icon button. */
export function ProjectRowButtons(props: RowActionProps) {
  const actions = useRowActions(props)
  return (
    <div className="flex justify-end gap-1">
      {actions.map((action) => (
        <Tooltip key={action.key}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={props.disabled}
              aria-label={`${action.label} “${props.project.name}”`}
              onClick={action.run}
              className={cn(
                action.destructive && 'hover:text-(--color-danger)',
              )}
            >
              <action.icon aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{action.label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}

/** < 640 px: the same actions behind a 44 px "⋯" trigger. */
export function ProjectRowMenu(props: RowActionProps) {
  const actions = useRowActions(props)
  // Closing the menu returns focus to its trigger; skip that when the action moves it.
  const skipFocusReturn = React.useRef(false)
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild disabled={props.disabled}>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Thao tác cho “${props.project.name}”`}
          className="size-11 shrink-0"
        >
          <Icons.more aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        collisionPadding={16}
        className="w-48"
        onCloseAutoFocus={(e) => {
          if (skipFocusReturn.current) e.preventDefault()
          skipFocusReturn.current = false
        }}
      >
        {actions.map((action) => (
          <React.Fragment key={action.key}>
            {action.destructive && <DropdownMenuSeparator />}
            <DropdownMenuItem
              variant={action.destructive ? 'destructive' : 'default'}
              onSelect={() => {
                skipFocusReturn.current = Boolean(action.movesFocus)
                action.run()
              }}
            >
              <action.icon aria-hidden="true" />
              {action.label}
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
