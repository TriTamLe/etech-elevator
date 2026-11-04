import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    cloudflare({
      viteEnvironment: { name: 'ssr' },
      // E2E runs on its own local D1 (reset by tests/e2e/reset-db.ts), never the dev one.
      persistState: process.env.E2E ? { path: '.wrangler/e2e' } : true,
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
