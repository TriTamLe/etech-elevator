import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { SearchIcon } from 'lucide-react'

import { useCommandPalette } from '#/components/app/command-palette'

/**
 * Top bar (Hallmark nav N13 · Cobalt): flush, one hairline under it, brand left,
 * a visible ⌘K search affordance right of the brand, page actions on the right.
 */
export function AppShell({
  actions,
  children,
}: {
  /** Page-level primary action (one solid accent button at most). */
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  const { setOpen } = useCommandPalette()

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-(--color-rule) bg-(--color-paper)/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-360 items-center gap-3 px-4 sm:gap-5 sm:px-6">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-3 text-(--color-brand) no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--color-focus)"
          >
            <img
              src="/brand/etech-logo.webp"
              alt="E-TECH Thang máy"
              width={585}
              height={265}
              className="h-7 w-auto"
            />
            <span className="hidden text-(length:--text-sm) font-semibold whitespace-nowrap sm:inline">
              Bản vẽ thang máy
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Mở bảng lệnh (⌘K)"
            className="group flex h-9 shrink-0 items-center gap-2 rounded-(--radius-control) border border-(--color-rule-2) bg-(--color-paper-2) px-3 text-(--color-ink-3) transition-[border-color] duration-(--dur-fast) ease-out hover:border-(--color-rule-strong) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus) sm:w-72 sm:justify-start"
          >
            <SearchIcon className="size-4" aria-hidden="true" />
            <span className="hidden text-(length:--text-sm) sm:inline">
              Tìm lệnh hoặc dự án…
            </span>
            <span className="ml-auto hidden gap-1 sm:flex" aria-hidden="true">
              <kbd>⌘</kbd>
              <kbd>K</kbd>
            </span>
          </button>

          <nav aria-label="Chính" className="flex items-center gap-4">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              className="relative text-(length:--text-sm) whitespace-nowrap text-(--color-ink-2) no-underline after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-(--color-accent) after:transition-transform after:duration-(--dur-base) after:ease-out hover:text-(--color-ink) hover:after:scale-x-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--color-focus) data-[status=active]:font-medium data-[status=active]:text-(--color-ink) data-[status=active]:after:scale-x-100"
            >
              Dự án
            </Link>
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {actions}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
