import type * as React from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import {
  useQueryErrorResetBoundary,
  useSuspenseQuery,
} from '@tanstack/react-query'

import { BrandMark } from '#/components/app/brand-mark'
import { Icons } from '#/components/app/icons'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { Editor } from '#/features/editor/editor'
import { errorMessage, projectQuery } from '#/features/projects/queries'

// Editor (Workbench). Client-only: the form, preview and PDF export live in the browser.
export const Route = createFileRoute('/projects/$id')({
  ssr: false,
  // getProject throws notFound() for a missing or deleted id → root NotFound page.
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(projectQuery(params.id)),
  pendingComponent: EditorPending,
  errorComponent: EditorError,
  component: EditorPage,
})

function EditorHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="flex items-center gap-3 border-b border-(--color-rule) px-4 py-3 sm:px-6">
      <Link
        to="/"
        className="inline-flex items-center gap-2 rounded-sm text-(length:--text-sm) text-(--color-ink-2) hover:text-(--color-ink) focus-visible:outline-2 focus-visible:outline-(--color-focus)"
      >
        <Icons.back className="size-4" aria-hidden="true" />
        <span className="max-sm:sr-only">Danh sách dự án</span>
      </Link>
      <BrandMark className="h-6" />
      <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
        {children}
      </div>
    </header>
  )
}

function EditorPage() {
  const { id } = Route.useParams()
  const { data: project } = useSuspenseQuery(projectQuery(id))
  return <Editor key={project.id} project={project} />
}

/** Matches the Workbench: form column (420 px) + graphite preview ≥ 1024 px, tabs below. */
function EditorPending() {
  const cards = (
    <div className="grid gap-3 p-3 sm:p-5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="grid gap-3 rounded-(--radius-card) border border-(--color-rule) p-4"
        >
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
        </div>
      ))}
    </div>
  )
  return (
    <div
      className="flex h-dvh flex-col"
      role="status"
      aria-label="Đang mở dự án"
    >
      <EditorHeader>
        <Skeleton className="h-9 w-24 max-sm:w-10" />
        <Skeleton className="h-9 w-24 max-sm:w-10" />
      </EditorHeader>
      <div className="hidden min-h-0 flex-1 grid-cols-[420px_minmax(0,1fr)] lg:grid">
        <div className="border-r border-(--color-rule)">{cards}</div>
        <div className="bg-(--color-graphite)" />
      </div>
      <div className="min-h-0 flex-1 lg:hidden">
        <Skeleton className="mx-4 my-2 h-9 max-md:h-12 sm:mx-5" />
        {cards}
      </div>
    </div>
  )
}

function EditorError({ error }: { error: unknown }) {
  // invalidate() re-runs the loader and resets the boundary; reset() alone would only
  // re-render the same failed match. The query boundary is reset too, or a query that
  // failed during render (useSuspenseQuery) would throw its cached error again.
  const router = useRouter()
  const queryErrors = useQueryErrorResetBoundary()
  return (
    <>
      <EditorHeader />
      <main className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <Alert variant="destructive">
          <AlertTitle>Không mở được dự án</AlertTitle>
          <AlertDescription>{errorMessage(error)}</AlertDescription>
        </Alert>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => {
            queryErrors.reset()
            void router.invalidate()
          }}
        >
          <Icons.restore aria-hidden="true" />
          Thử lại
        </Button>
      </main>
    </>
  )
}
