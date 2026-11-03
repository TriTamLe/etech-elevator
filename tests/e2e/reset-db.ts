import { execFileSync } from 'node:child_process'
import { rmSync } from 'node:fs'

// A fresh local D1 for every E2E run, at vite.config.ts's persistState path. Runs in the
// webServer command, before the dev server starts: Playwright starts webServer before
// globalSetup, and deleting the files under a running workerd breaks D1 mid-run.
rmSync('.wrangler/e2e', { recursive: true, force: true })
execFileSync(
  'npx',
  [
    'wrangler',
    'd1',
    'migrations',
    'apply',
    'elevator-db',
    '--local',
    '--persist-to',
    '.wrangler/e2e',
  ],
  // stderr shown: a failed migration says why instead of "webServer exited early".
  { stdio: ['ignore', 'ignore', 'inherit'] },
)
