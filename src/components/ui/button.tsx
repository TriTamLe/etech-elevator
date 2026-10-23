import * as React from 'react'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { Loader2Icon } from 'lucide-react'
import { Slot } from 'radix-ui'

import { cn } from '#/lib/utils'

// Cobalt control: 6px radius, constant 1px border, instant focus ring, no transition-all.
// States: default · hover (hover-capable pointers only) · focus-visible · active · disabled ·
// loading (aria-busy) · error (aria-invalid) · success (data-status="success").
const buttonVariants = cva(
  [
    'relative inline-flex shrink-0 items-center justify-center gap-2 select-none whitespace-nowrap',
    'rounded-(--radius-control) border border-transparent font-medium',
    'transition-[background-color,border-color,color] duration-(--dur-fast) ease-(--ease-out)',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus)',
    'active:translate-y-px',
    'disabled:cursor-not-allowed disabled:opacity-55 aria-busy:cursor-progress',
    // Focusable-but-unavailable (e.g. "Tải PDF" while errors remain); loading uses aria-busy instead.
    'aria-disabled:not-aria-busy:cursor-not-allowed aria-disabled:not-aria-busy:opacity-55',
    'aria-invalid:border-(--color-danger)',
    'data-[status=success]:border-(--color-ok) data-[status=success]:bg-(--color-ok) data-[status=success]:text-(--color-accent-ink)',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        default:
          'bg-(--color-accent) text-(--color-accent-ink) hover:bg-(--color-accent-hover)',
        destructive:
          'bg-(--color-danger) text-(--color-accent-ink) hover:bg-(--color-danger)/90',
        outline:
          'border-(--color-rule-2) bg-(--color-paper) text-(--color-ink) hover:bg-(--color-paper-2)',
        secondary:
          'bg-(--color-paper-2) text-(--color-ink) hover:border-(--color-rule-2)',
        ghost: 'text-(--color-ink-2) hover:bg-(--color-paper-2)',
        link: 'h-auto px-0 text-(--color-accent) underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-(--control-h) px-4 text-sm',
        xs: 'h-7 gap-1 px-2 text-xs',
        sm: 'h-8 gap-2 px-3 text-sm',
        lg: 'h-11 px-6 text-base',
        icon: 'size-(--control-h)',
        'icon-xs': 'size-7',
        'icon-sm': 'size-8',
        'icon-lg': 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Replaces the label with a spinner, keeps the width, blocks clicks. */
    loading?: boolean
  }

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  loading = false,
  disabled,
  children,
  onClick,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      // Real `disabled` only for disabled; loading keeps focus (aria-disabled + click guard).
      disabled={asChild ? undefined : disabled}
      aria-disabled={(asChild && disabled) || loading || undefined}
      aria-busy={loading || undefined}
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        if (loading || (asChild && disabled)) {
          e.preventDefault()
          return
        }
        onClick?.(e)
      }}
      {...props}
    >
      {loading && !asChild ? (
        <>
          <span className="invisible inline-flex items-center gap-2">
            {children}
          </span>
          <span className="absolute inset-0 grid place-items-center">
            <Loader2Icon className="animate-spin" aria-hidden="true" />
          </span>
        </>
      ) : (
        children
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
