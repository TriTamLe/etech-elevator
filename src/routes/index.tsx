import * as React from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { BrandMark } from '#/components/app/brand-mark'
import { OfflineBanner } from '#/components/app/offline-banner'
import { Icons } from '#/components/app/icons'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Kbd } from '#/components/ui/kbd'
import { APP_NAME } from '#/config/app'
import { CreateProjectDialog } from '#/features/projects/create-project-dialog'
import { ImportProjectButton } from '#/features/projects/import-project-button'
import {
  ProjectTable,
  ProjectTableSkeleton,
} from '#/features/projects/project-table'
import { errorMessage, projectsQuery } from '#/features/projects/queries'
import { useDebouncedValue } from '#/lib/use-debounced-value'
import { useHotkey } from '#/lib/use-hotkey'
import { useHydrationMark } from '#/lib/use-hydration-mark'

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

  const search = React.useRef<HTMLInputElement>(null)
  useHotkey('/', () => {
    search.current?.focus()
    search.current?.select()
  })
  // After useHotkey: effects run in order, so "/" is live once the mark is set.
  useHydrationMark()

  return (
    <main className="mx-auto max-w-3xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16">
      <header className="grid justify-items-center text-center">
        <BrandMark className="h-12 sm:h-16" />
        <h1 className="mt-6 text-(length:--text-xl) font-semibold text-balance sm:text-(length:--text-2xl)">
          {APP_NAME}
        </h1>
        <div className="mt-3 flex flex-wrap justify-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/symbols">
              <Icons.symbols aria-hidden="true" />
              Thư viện ký hiệu
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/primitives">
              <Icons.primitives aria-hidden="true" />
              Phần tử vẽ
            </Link>
          </Button>
        </div>
      </header>

      <OfflineBanner className="mt-8 overflow-hidden rounded-(--radius-card) border border-(--color-rule) [&>p]:border-0" />

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
              ref={search}
              type="search"
              aria-label="Tìm dự án"
              aria-keyshortcuts="/"
              placeholder="Tìm dự án…"
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
              <span
                role="status"
                className="absolute top-1/2 right-3 -translate-y-1/2 text-(--color-ink-3)"
              >
                <Icons.loading
                  className="size-4 motion-safe:animate-spin"
                  aria-hidden="true"
                />
                <span className="sr-only">Đang cập nhật danh sách</span>
              </span>
            ) : input ? (
              <button
                type="button"
                aria-label="Xóa tìm kiếm"
                onClick={clear}
                className="absolute top-1/2 right-1 grid size-8 -translate-y-1/2 place-items-center rounded-(--radius-control) text-(--color-ink-3) hover:text-(--color-ink) focus-visible:outline-2 focus-visible:outline-(--color-focus) max-md:right-0 max-md:size-11"
              >
                <Icons.clear className="size-4" aria-hidden="true" />
              </button>
            ) : (
              <Kbd
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 max-sm:hidden"
              >
                /
              </Kbd>
            )}
          </div>
          <ImportProjectButton />
          <CreateProjectDialog />
        </div>

        {/* Rows already shown stay put when a refetch fails; the big alert is only for a
            first load that never arrived. */}
        {list.isError && list.data && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-(--color-rule) bg-(--color-danger-soft) px-3 py-2 text-(length:--text-sm)"
          >
            <span className="text-(--color-danger)">
              Không tải lại được danh sách. {errorMessage(list.error)}
            </span>
            <Button
              variant="link"
              size="sm"
              loading={list.isFetching}
              onClick={() => void list.refetch()}
            >
              Thử lại
            </Button>
          </div>
        )}
        {list.data ? (
          <ProjectTable
            rows={list.data}
            query={debounced}
            onClearQuery={clear}
          />
        ) : list.isError ? (
          <div className="p-3">
            <Alert variant="destructive">
              <AlertTitle>Không tải được danh sách dự án</AlertTitle>
              <AlertDescription>{errorMessage(list.error)}</AlertDescription>
            </Alert>
            <Button
              variant="outline"
              className="mt-3"
              loading={list.isFetching}
              onClick={() => void list.refetch()}
            >
              <Icons.restore aria-hidden="true" />
              Thử lại
            </Button>
          </div>
        ) : (
          <ProjectTableSkeleton />
        )}
      </section>
    </main>
  )
}
