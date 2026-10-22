import { createFileRoute } from '@tanstack/react-router'
import { FolderOpenIcon } from 'lucide-react'

import { AppShell } from '#/components/app/app-shell'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/')({ component: ProjectsPage })

// Placeholder until super-plan P3 wires the real project list to D1.
function ProjectsPage() {
  return (
    <AppShell
      actions={
        <Button disabled title="Có ở phase P3">
          Tạo dự án
        </Button>
      }
    >
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-(length:--text-2xl) font-semibold">Dự án</h1>
        <div className="mt-8 grid place-items-center gap-3 rounded-(--radius-card) border border-dashed border-(--color-rule-2) px-6 py-16 text-center">
          <FolderOpenIcon
            className="size-6 text-(--color-ink-3)"
            aria-hidden="true"
          />
          <p className="font-medium text-(--color-ink)">Chưa có dự án nào</p>
          <p className="max-w-sm text-(length:--text-sm) text-(--color-ink-3)">
            Tạo dự án từ một trong hai bộ mẫu để bắt đầu. Chức năng này có ở
            phase P3.
          </p>
        </div>
      </div>
    </AppShell>
  )
}
