import { execFileSync } from 'node:child_process'
import { rmSync } from 'node:fs'

// A fresh local D1 for every E2E run: same path as vite.config.ts's persistState.
export default function globalSetup() {
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
    { stdio: 'ignore' },
  )
}
