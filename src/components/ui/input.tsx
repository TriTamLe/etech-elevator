import * as React from 'react'

import { cn } from '#/lib/utils'

// Shared field-surface classes (input, textarea, select trigger). Border width never changes;
// focus is an outline in a reserved slot, so no state causes layout shift.
export const fieldSurface = cn(
  'w-full min-w-0 rounded-(--radius-control) border border-(--color-rule-strong) bg-(--color-paper)',
  'text-(length:--text-base) text-(--color-ink) tabular-nums',
  'outline-2 outline-offset-1 outline-transparent',
  'transition-[background-color] duration-(--dur-fast) ease-(--ease-out)',
  'placeholder:text-(--color-ink-3)',
  'hover:bg-(--color-paper-2)',
  'focus-visible:border-(--color-ink-2) focus-visible:outline-(--color-focus)',
  'aria-invalid:border-(--color-danger)',
  'data-[status=success]:border-(--color-ok)',
  'disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-(--color-paper)',
)

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      // pr-9 keeps the right-edge slot free for the error / success / loading glyph.
      className={cn(fieldSurface, 'h-(--control-h) px-3 pr-9', className)}
      {...props}
    />
  )
}

export { Input }
