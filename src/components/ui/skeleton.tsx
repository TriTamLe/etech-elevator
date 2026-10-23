import * as React from 'react'

import { cn } from '#/lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded-(--radius-control) bg-(--color-paper-2)',
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
