import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createSortedRowModel,
  globalFilteringFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import type {
  Column,
  FilterFn,
  SortFn,
  SortingState,
} from '@tanstack/react-table'

import { Icons } from '#/components/app/icons'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { DeleteProjectDialog } from '#/features/projects/delete-project-dialog'
import { EditProjectDialog } from '#/features/projects/edit-project-dialog'
import {
  ProjectRowButtons,
  ProjectRowMenu,
} from '#/features/projects/project-row-actions'
import { usePendingRowIds } from '#/features/projects/queries'
import { formatUpdatedAt } from '#/lib/format'
import { matchesQuery } from '#/lib/search'
import { cn } from '#/lib/utils'
import type { ProjectListItem } from '#/server/project-repo'

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
})

type Features = typeof features

const collator = new Intl.Collator('vi', { sensitivity: 'base', numeric: true })
const byName: SortFn<Features, ProjectListItem> = (a, b) =>
  collator.compare(a.original.name, b.original.name)
const byDate: SortFn<Features, ProjectListItem> = (a, b) =>
  a.original.updatedAt.getTime() - b.original.updatedAt.getTime()

// One filter over name + address together, so "nha da nang" can match across both.
const searchFilter: FilterFn<Features, ProjectListItem> = (row, _id, query) =>
  matchesQuery([row.original.name, row.original.address], String(query))

const helper = createColumnHelper<Features, ProjectListItem>()
const columns = helper.columns([
  helper.accessor('name', { header: 'Tên công trình', sortFn: byName }),
  helper.accessor('address', { header: 'Địa chỉ', enableSorting: false }),
  helper.accessor('updatedAt', {
    header: 'Cập nhật',
    sortFn: byDate,
    sortDescFirst: true,
  }),
])

const ROW_H = 'h-12 pointer-coarse:h-13'

export function ProjectTable({
  rows,
  query,
  onClearQuery,
}: {
  rows: Array<ProjectListItem>
  query: string
  onClearQuery: () => void
}) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'updatedAt', desc: true },
  ])
  const [editing, setEditing] = React.useState<ProjectListItem | null>(null)
  const [deleting, setDeleting] = React.useState<ProjectListItem | null>(null)
  // Captured when the confirmation opens: by the time it closes the row is already gone.
  const deleteNeighbour = React.useRef<string | undefined>(undefined)
  const now = new Date()
  const pending = usePendingRowIds()

  const table = useTable({
    features,
    columns,
    data: rows,
    getRowId: (row) => row.id,
    state: { sorting, globalFilter: query },
    onSortingChange: setSorting,
    enableSortingRemoval: false,
    globalFilterFn: searchFilter,
    getColumnCanGlobalFilter: (column) => column.id === 'name',
  })

  const visible = table.getRowModel().rows
  // Keyboard users keep their place: after edit/delete, focus a row's name link
  // (whichever layout is showing) once React has re-rendered, else the search box.
  const container = React.useRef<HTMLDivElement>(null)
  const focusRow = (id: string | undefined) =>
    requestAnimationFrame(() => {
      const links = id
        ? container.current?.querySelectorAll<HTMLElement>(
            `[data-row-id="${id}"]`,
          )
        : undefined
      const target = [...(links ?? [])].find((el) => el.offsetParent !== null)
      ;(
        target ?? document.querySelector<HTMLElement>('input[type=search]')
      )?.focus()
    })
  const neighbourOf = (id: string): string | undefined => {
    const i = visible.findIndex((r) => r.id === id)
    return visible.at(i + 1)?.id ?? (i > 0 ? visible[i - 1].id : undefined)
  }

  const openDelete = (p: ProjectListItem) => {
    deleteNeighbour.current = neighbourOf(p.id)
    setDeleting(p)
  }

  // Dialogs stay mounted whatever the body shows: deleting the last row, or an edit that
  // stops matching ?q=, must not unmount them mid close-animation.
  const dialogs = (
    <>
      <EditProjectDialog
        project={editing}
        onClose={() => setEditing(null)}
        onRestoreFocus={focusRow}
      />
      <DeleteProjectDialog
        project={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={() => focusRow(deleteNeighbour.current)}
        onCancelled={focusRow}
      />
    </>
  )

  if (rows.length === 0) {
    return (
      <>
        {dialogs}
        <EmptyState
        title="Chưa có dự án nào"
        body="Tạo dự án mới từ một trong hai bộ mẫu, hoặc nhập file JSON."
        />
      </>
    )
  }
  if (visible.length === 0) {
    return (
      <>
        {dialogs}
        <EmptyState
        title={`Không có dự án khớp “${query.trim()}”`}
        body="Thử bỏ dấu hoặc tìm theo địa chỉ."
        action={
          <Button variant="outline" size="sm" onClick={onClearQuery}>
            <Icons.clear aria-hidden="true" />
            Xóa tìm kiếm
          </Button>
        }
        />
      </>
    )
  }

  const nameHeader = table.getColumn('name')
  const dateHeader = table.getColumn('updatedAt')

  return (
    <div ref={container}>
      {/* ≥ 640 px: fixed-layout table */}
      <table className="hidden w-full table-fixed text-(length:--text-sm) sm:table">
        <colgroup>
          <col />
          <col className="w-[30%]" />
          <col className="w-32" />
          <col className="w-38" />
        </colgroup>
        <thead>
          <tr className="border-b border-(--color-rule) text-left">
            <SortHeader column={nameHeader} />
            <th scope="col" className="px-3 label-mono font-normal text-(--color-ink-3)">
              Địa chỉ
            </th>
            <SortHeader column={dateHeader} />
            <th scope="col" className="px-3">
              <span className="sr-only">Thao tác</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {visible.map(({ original: p }) => {
            const busy = pending.has(p.id)
            return (
              <tr
                key={p.id}
                aria-busy={busy || undefined}
                className={cn(
                  ROW_H,
                  'border-b border-(--color-rule) transition-opacity duration-(--dur-fast) last:border-0 hover:bg-(--color-paper-2)',
                  busy && 'opacity-55',
                )}
              >
                <td className="min-w-0 px-3">
                  <ProjectLink project={p} className="block truncate" />
                </td>
                <td
                  className="truncate px-3 text-(--color-ink-2)"
                  title={p.address || undefined}
                >
                  <Address value={p.address} />
                </td>
                <td className="px-3 font-mono text-(length:--text-xs) whitespace-nowrap text-(--color-ink-3)">
                  {formatUpdatedAt(p.updatedAt, now)}
                </td>
                <td className="px-2">
                  <ProjectRowButtons
                    project={p}
                    disabled={busy}
                    onEdit={() => setEditing(p)}
                    onDelete={() => openDelete(p)}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* < 640 px: the same row model as a stacked list */}
      <ul className="sm:hidden">
        {visible.map(({ original: p }) => {
          const busy = pending.has(p.id)
          return (
            <li
              key={p.id}
              aria-busy={busy || undefined}
              className={cn(
                'flex items-center gap-2 border-b border-(--color-rule) py-2 pr-1 pl-3 last:border-0',
                busy && 'opacity-55',
              )}
            >
              <div className="min-w-0 flex-1">
                <ProjectLink project={p} className="line-clamp-2" />
                <p className="mt-0.5 flex min-w-0 gap-2 text-(length:--text-xs) text-(--color-ink-3)">
                  <span className="truncate" title={p.address || undefined}>
                    <Address value={p.address} />
                  </span>
                  <span className="shrink-0 font-mono">
                    {formatUpdatedAt(p.updatedAt, now)}
                  </span>
                </p>
              </div>
              <ProjectRowMenu
                project={p}
                disabled={busy}
                onEdit={() => setEditing(p)}
                onDelete={() => openDelete(p)}
              />
            </li>
          )
        })}
      </ul>

      {dialogs}
    </div>
  )
}

function SortHeader({
  column,
}: {
  column: Column<Features, ProjectListItem> | undefined
}) {
  if (!column) return null
  const sorted = column.getIsSorted()
  const Icon = !sorted
    ? Icons.sort
    : sorted === 'asc'
      ? Icons.sortAsc
      : Icons.sortDesc
  return (
    <th
      scope="col"
      aria-sort={
        !sorted ? 'none' : sorted === 'asc' ? 'ascending' : 'descending'
      }
      className="px-1 font-normal"
    >
      <button
        type="button"
        onClick={column.getToggleSortingHandler()}
        className={cn(
          'inline-flex h-10 items-center gap-1.5 rounded-(--radius-control) px-2 label-mono text-(--color-ink-3) hover:text-(--color-ink) focus-visible:outline-2 focus-visible:outline-(--color-focus)',
          sorted && 'text-(--color-ink)',
        )}
      >
        {column.columnDef.header as string}
        <Icon className="size-4" aria-hidden="true" />
      </button>
    </th>
  )
}

function ProjectLink({
  project,
  className,
}: {
  project: ProjectListItem
  className?: string
}) {
  return (
    <Link
      to="/projects/$id"
      params={{ id: project.id }}
      data-row-id={project.id}
      title={project.name}
      className={cn(
        'rounded-sm font-medium text-(--color-ink) hover:text-(--color-accent) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus)',
        className,
      )}
    >
      {project.name}
    </Link>
  )
}

/** Address cell text; an empty address shows a quiet dash. */
function Address({ value }: { value: string }) {
  return value ? (
    value
  ) : (
    <span aria-label="Chưa có địa chỉ" className="text-(--color-ink-3)">
      —
    </span>
  )
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: React.ReactNode
}) {
  return (
    <div className="grid place-items-center gap-2 px-6 py-10 text-center">
      <Icons.empty className="size-6 text-(--color-ink-3)" aria-hidden="true" />
      <p className="font-medium text-pretty text-(--color-ink)">{title}</p>
      <p className="text-(length:--text-sm) text-(--color-ink-3)">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/** Placeholder rows at the real row height so the list does not jump when data lands. */
export function ProjectTableSkeleton() {
  return (
    <ul aria-label="Đang tải danh sách dự án">
      {Array.from({ length: 5 }, (_, i) => (
        <li
          key={i}
          className={cn(
            'flex h-16 items-center gap-4 border-b border-(--color-rule) px-3 last:border-0 sm:h-12 sm:pointer-coarse:h-13',
          )}
        >
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="hidden h-4 w-[30%] sm:block" />
          <Skeleton className="h-4 w-24" />
        </li>
      ))}
    </ul>
  )
}
