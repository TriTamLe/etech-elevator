import type * as React from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'

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

function EditorPending() {
  return (
    <>
      <EditorHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="mt-3 h-4 w-1/3" />
      </main>
    </>
  )
}

function EditorError({ error, reset }: { error: unknown; reset: () => void }) {
  return (
    <>
      <EditorHeader />
      <main className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <Alert variant="destructive">
          <AlertTitle>Không mở được dự án</AlertTitle>
          <AlertDescription>{errorMessage(error)}</AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={reset}>
          <Icons.restore aria-hidden="true" />
          Thử lại
        </Button>
      </main>
    </>
  )
}
