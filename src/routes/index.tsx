import * as React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { BrandMark } from '#/components/app/brand-mark'
import { Icons } from '#/components/app/icons'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { CreateProjectDialog } from '#/features/projects/create-project-dialog'
import { ImportProjectButton } from '#/features/projects/import-project-button'
import {
  ProjectTable,
  ProjectTableSkeleton,
} from '#/features/projects/project-table'
import { errorMessage, projectsQuery } from '#/features/projects/queries'
import { useDebouncedValue } from '#/lib/use-debounced-value'

const Search = z.object({ q: z.string().optional().catch(undefined) })

export const Route = createFileRoute('/')({
  validateSearch: Search,
  // SSR renders the list with data (no spinner on first load). prefetchQuery never
  // throws, so a failed load shows the inline Alert + "Thử lại" instead of an error page.
  loader: ({ context }) => context.queryClient.prefetchQuery(projectsQuery),
  component: ProjectsPage,
})

function ProjectsPage() {
  const { q = '' } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [input, setInput] = React.useState(q)
  const debounced = useDebouncedValue(input, 250)

  // Typing → URL after the debounce; back/forward → input.
  React.useEffect(() => {
    if (debounced === q) return
    void navigate({
      search: { q: debounced || undefined },
      replace: true,
    })
  }, [debounced])
  React.useEffect(() => {
    setInput(q)
  }, [q])

  const clear = () => {
    setInput('')
    void navigate({ search: {}, replace: true })
  }

  const list = useQuery({ ...projectsQuery, placeholderData: keepPreviousData })
  const refetching = list.isFetching && !list.isPending

  return (
    <main className="mx-auto max-w-3xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16">
      <header className="grid justify-items-center text-center">
        <BrandMark className="h-12 sm:h-16" />
        <h1 className="mt-6 text-(length:--text-xl) font-semibold text-balance sm:text-(length:--text-2xl)">
          Công cụ tự động sinh báo cáo thiết kế thang máy
        </h1>
      </header>

      <section
        aria-label="Danh sách dự án"
        className="mt-8 rounded-(--radius-card) border border-(--color-rule) bg-(--color-paper)"
      >
        <div className="sticky top-0 z-10 flex gap-2 rounded-t-(--radius-card) border-b border-(--color-rule) bg-(--color-paper) p-3">
          <div className="relative min-w-0 flex-1">
            <Icons.search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-(--color-ink-3)"
              aria-hidden="true"
            />
            <Input
              type="search"
              aria-label="Tìm dự án"
              placeholder="Tìm theo tên công trình hoặc địa chỉ…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && input) {
                  e.preventDefault()
                  clear()
                }
              }}
              className="pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
            />
            {refetching ? (
              <Icons.loading
                className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-(--color-ink-3)"
                aria-label="Đang cập nhật danh sách"
              />
            ) : (
              input && (
                <button
                  type="button"
                  aria-label="Xóa tìm kiếm"
                  onClick={clear}
                  className="absolute top-1/2 right-1 grid size-8 -translate-y-1/2 place-items-center rounded-(--radius-control) text-(--color-ink-3) hover:text-(--color-ink) focus-visible:outline-2 focus-visible:outline-(--color-focus)"
                >
                  <Icons.clear className="size-4" aria-hidden="true" />
                </button>
              )
            )}
          </div>
          <ImportProjectButton />
          <CreateProjectDialog />
        </div>

        {list.isPending ? (
          <ProjectTableSkeleton />
        ) : list.isError ? (
          <div className="p-3">
            <Alert variant="destructive">
              <AlertTitle>Không tải được danh sách dự án</AlertTitle>
              <AlertDescription>{errorMessage(list.error)}</AlertDescription>
            </Alert>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              loading={list.isFetching}
              onClick={() => void list.refetch()}
            >
              <Icons.restore aria-hidden="true" />
              Thử lại
            </Button>
          </div>
        ) : (
          <ProjectTable rows={list.data} query={debounced} onClearQuery={clear} />
        )}
      </section>
    </main>
  )
}
