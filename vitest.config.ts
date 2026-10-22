import { defineConfig } from 'vitest/config'

// Kept separate from vite.config.ts so unit tests run in plain Node,
// without the Cloudflare / TanStack Start plugins.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ['src/tests/**/*.test.ts', 'src/tests/**/*.test.tsx'],
    environment: 'node',
  },
})
