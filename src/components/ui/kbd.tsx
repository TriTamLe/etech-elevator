import type * as React from 'react'

import { cn } from '#/lib/utils'

/** A key or shortcut ("⌘ S", "/") in the mono label voice. Decorative: name it elsewhere. */
export function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] border border-(--color-rule-2) bg-(--color-paper-2) px-1 font-mono text-(length:--text-xs) leading-none text-(--color-ink-2)',
        className,
      )}
      {...props}
    />
  )
}
