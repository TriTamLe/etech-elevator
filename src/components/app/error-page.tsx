import * as React from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'

import { BrandMark } from '#/components/app/brand-mark'
import { Icons } from '#/components/app/icons'
import { Button } from '#/components/ui/button'
import { errorMessage } from '#/lib/error-message'

/** Root/default error page: what went wrong in Vietnamese, retry (re-runs loaders) or go home. */
export function ErrorPage({ error }: ErrorComponentProps) {
  const router = useRouter()
  React.useEffect(() => console.error(error), [error])
  return (
    <main className="mx-auto grid max-w-xl justify-items-center px-4 pt-16 pb-16 text-center sm:px-6">
      <BrandMark className="h-10" />
      <h1 className="mt-10 text-(length:--text-2xl) font-semibold">
        Không mở được trang
      </h1>
      <p className="mt-3">{errorMessage(error)}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={() => void router.invalidate()}>
          <Icons.restore aria-hidden="true" />
          Thử lại
        </Button>
        <Button variant="outline" asChild>
          <Link to="/">Về danh sách dự án</Link>
        </Button>
      </div>
    </main>
  )
}
