import { defineConfig } from '@playwright/test'

// E2E in the locally installed Chrome (no browser download), against a dev server of
// its own on port 3100 with its own local D1 (.wrangler/e2e, reset by global-setup).
//   yarn test:e2e            · yarn test:e2e:update  (refresh the sheet baselines)

const PORT = 3100

export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  // One D1 for every test.
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  snapshotPathTemplate: 'tests/e2e/__snapshots__/{arg}{ext}',
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome',
    viewport: { width: 1440, height: 900 },
    locale: 'vi-VN',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `yarn dev --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    env: { E2E: '1' },
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
