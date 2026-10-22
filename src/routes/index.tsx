import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { FolderOpenIcon, PlusIcon, SearchIcon } from 'lucide-react'

import { BrandMark } from '#/components/app/brand-mark'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'

export const Route = createFileRoute('/')({ component: ProjectsPage })

// Placeholder until super-plan P3 wires the real project list to D1.
function ProjectsPage() {
  const [query, setQuery] = React.useState('')

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
        <div className="flex gap-2 border-b border-(--color-rule) p-3">
          <div className="relative min-w-0 flex-1">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-(--color-ink-3)"
              aria-hidden="true"
            />
            <Input
              type="search"
              aria-label="Tìm dự án"
              placeholder="Tìm theo tên công trình hoặc địa chỉ…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              {/* Disabled buttons swallow pointer events; the span keeps the tooltip working. */}
              <span
                tabIndex={0}
                className="shrink-0 rounded-(--radius-control)"
              >
                <Button disabled aria-label="Tạo dự án">
                  <PlusIcon aria-hidden="true" />
                  <span className="hidden sm:inline">Tạo dự án</span>
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Có ở phase P3</TooltipContent>
          </Tooltip>
        </div>

        <div className="grid place-items-center gap-2 px-6 py-10 text-center">
          <FolderOpenIcon
            className="size-6 text-(--color-ink-3)"
            aria-hidden="true"
          />
          <p className="font-medium text-(--color-ink)">Chưa có dự án nào</p>
          <p className="text-(length:--text-sm) text-(--color-ink-3)">
            Tạo dự án mới từ một trong hai bộ mẫu.
          </p>
        </div>
      </section>
    </main>
  )
}
