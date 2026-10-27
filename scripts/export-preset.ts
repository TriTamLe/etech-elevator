// Exports presets to .verify/<preset>.pdf through the running dev server's /dev/export
// route, in the locally installed Chrome (playwright-core: no browser download).
//
//   yarn dev                       # in another terminal
//   yarn export:preset hotel-9f    # or: house-5f · all (default)
//   EXPORT_BASE_URL=http://localhost:3001 yarn export:preset all
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright-core'

import { PRESET_IDS } from '../src/domain/presets'
import type { PresetId } from '../src/domain/presets'

const BASE_URL = process.env.EXPORT_BASE_URL ?? 'http://localhost:3000'
const OUT_DIR = '.verify'
const TIMEOUT_MS = 60_000

function presetsFromArgs(args: Array<string>): Array<PresetId> {
  if (args.length === 0 || args.includes('all')) return [...PRESET_IDS]
  const unknown = args.filter((a) => !PRESET_IDS.includes(a as PresetId))
  if (unknown.length > 0) {
    throw new Error(
      `Không có bộ mẫu: ${unknown.join(', ')}. Chọn trong: ${PRESET_IDS.join(', ')}, all.`,
    )
  }
  return args as Array<PresetId>
}

async function main() {
  const presets = presetsFromArgs(process.argv.slice(2))
  await mkdir(OUT_DIR, { recursive: true })
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const page = await browser.newPage()
    page.on('pageerror', (e) => console.error(`[trang] ${e.message}`))
    for (const preset of presets) {
      const url = `${BASE_URL}/dev/export?preset=${preset}`
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded' })
      } catch {
        throw new Error(`Không mở được ${url} — yarn dev đã chạy chưa?`)
      }
      const done = page.locator(
        'main[data-state="ready"], main[data-state="error"]',
      )
      await done.waitFor({ timeout: TIMEOUT_MS })
      if ((await done.getAttribute('data-state')) === 'error') {
        throw new Error(`${preset}: ${await done.innerText()}`)
      }
      const base64 = await page.evaluate(() => window.__pdf ?? '')
      const file = `${OUT_DIR}/${preset}.pdf`
      await writeFile(file, Buffer.from(base64, 'base64'))
      console.log(`${file} (${Math.round((base64.length * 3) / 4 / 1024)} KB)`)
    }
  } finally {
    await browser.close()
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
