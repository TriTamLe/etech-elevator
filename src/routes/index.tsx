import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: ProjectsPage })

// Placeholder until super-plan P3 builds the real project list.
function ProjectsPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Danh sách dự án</h1>
      <p className="mt-2">Đang xây dựng — xem docs/super-plan.md, phase P3.</p>
    </main>
  )
}
