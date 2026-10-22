import * as React from 'react'
import {
  HeadContent,
  Link,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import { BrandMark } from '#/components/app/brand-mark'
import { Toaster } from '#/components/ui/sonner'
import { TooltipProvider } from '#/components/ui/tooltip'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Công cụ tự động sinh báo cáo thiết kế thang máy',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        href: '/favicon.ico',
      },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
})

function NotFound() {
  return (
    <main className="mx-auto grid max-w-xl justify-items-center px-4 pt-16 pb-16 text-center sm:px-6">
      <BrandMark className="h-10" />
      <p className="mt-10 label-mono text-(--color-ink-3)">404</p>
      <h1 className="mt-2 text-(length:--text-2xl) font-semibold">
        Không tìm thấy trang
      </h1>
      <p className="mt-3">Đường dẫn này không tồn tại hoặc dự án đã bị xóa.</p>
      <Link to="/" className="mt-6 inline-block">
        Về danh sách dự án
      </Link>
    </main>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <HeadContent />
      </head>
      <body>
        <TooltipProvider delayDuration={800}>{children}</TooltipProvider>
        <Toaster />
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
              TanStackQueryDevtools,
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  )
}
