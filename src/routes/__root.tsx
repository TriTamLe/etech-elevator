import * as React from 'react'
import {
  HeadContent,
  Link,
  Scripts,
  createRootRouteWithContext,
  useNavigate,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import { AppShell } from '#/components/app/app-shell'
import {
  CommandPaletteProvider,
  useRegisterCommands,
} from '#/components/app/command-palette'
import type { AppCommand } from '#/components/app/command-palette'
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
        title: 'Bản vẽ thang máy',
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
    <AppShell>
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <p className="label-mono text-(--color-ink-3)">404</p>
        <h1 className="mt-2 text-(length:--text-2xl) font-semibold">
          Không tìm thấy trang
        </h1>
        <p className="mt-3">
          Đường dẫn này không tồn tại hoặc dự án đã bị xóa.
        </p>
        <Link to="/" className="mt-6 inline-block">
          Về danh sách dự án
        </Link>
      </div>
    </AppShell>
  )
}

/** Commands available on every page. Pages register their own on top. */
function GlobalCommands() {
  const navigate = useNavigate()
  const commands = React.useMemo<Array<AppCommand>>(() => {
    const list: Array<AppCommand> = [
      {
        id: 'nav-projects',
        group: 'Điều hướng',
        label: 'Đi tới danh sách dự án',
        keywords: ['du an', 'trang chu'],
        run: () => void navigate({ to: '/' }),
      },
    ]
    if (import.meta.env.DEV) {
      list.push({
        id: 'dev-ui',
        group: 'Phát triển',
        label: 'Bộ sưu tập giao diện',
        keywords: ['dev', 'ui', 'giao dien'],
        run: () => void navigate({ to: '/dev/ui' }),
      })
    }
    return list
  }, [navigate])
  useRegisterCommands(commands)
  return null
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <HeadContent />
      </head>
      <body>
        <TooltipProvider delayDuration={800}>
          <CommandPaletteProvider>
            <GlobalCommands />
            {children}
          </CommandPaletteProvider>
        </TooltipProvider>
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
