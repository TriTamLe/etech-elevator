import { execFileSync } from 'node:child_process'
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// Shared E2E helpers. PDFs are rasterised with poppler (pdftoppm / pdfinfo), which the
// machine must have, as for the sheet-verifier agent.

function withPdf<T>(pdf: Buffer, run: (dir: string, file: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), 'e2e-pdf-'))
  try {
    const file = join(dir, 'doc.pdf')
    writeFileSync(file, pdf)
    return run(dir, file)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** Every page of a PDF as a PNG at `dpi`, in page order. */
export function pdfPages(pdf: Buffer, dpi = 100): Array<Buffer> {
  return withPdf(pdf, (dir, file) => {
    execFileSync('pdftoppm', ['-r', String(dpi), '-png', file, join(dir, 'p')])
    const page = (f: string) => Number(/-(\d+)\.png$/.exec(f)?.[1] ?? 0)
    return readdirSync(dir)
      .filter((f) => f.endsWith('.png'))
      .sort((a, b) => page(a) - page(b))
      .map((f) => readFileSync(join(dir, f)))
  })
}

/** Page count from pdfinfo. */
export function pdfPageCount(pdf: Buffer): number {
  return withPdf(pdf, (_dir, file) => {
    const info = execFileSync('pdfinfo', [file], { encoding: 'utf8' })
    return Number(/^Pages:\s+(\d+)/m.exec(info)?.[1] ?? NaN)
  })
}

/** A project name no earlier run used. */
export const uniqueName = (base: string) =>
  `${base} ${Date.now().toString(36).toUpperCase()}`

/** `[id="field-<path>"]`: every editor control's DOM id is fieldId(path). */
export const field = (page: Page, path: string) =>
  page.locator(`[id="field-${path}"]`)

/**
 * Opens a page and waits until React has hydrated it: the project list is rendered on
 * the server, and a click before hydration does nothing.
 */
export async function open(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'networkidle' })
}

/** Creates a project from a preset in the dialog and waits for its editor. */
export async function createProject(
  page: Page,
  name: string,
  preset: 'Khách sạn 9 tầng' | 'Nhà ở 5 tầng' = 'Nhà ở 5 tầng',
) {
  await open(page, '/')
  const dialog = page.getByRole('dialog')
  await expect(async () => {
    await page.getByRole('button', { name: 'Tạo dự án' }).click()
    await expect(dialog).toBeVisible({ timeout: 1000 })
  }).toPass()
  await dialog.getByText(preset).click()
  await dialog.getByLabel('Tên công trình').fill(name)
  await dialog.getByRole('button', { name: 'Tạo dự án' }).click()
  await page.waitForURL(/\/projects\//)
  await expect(field(page, 'tech.loadKg')).toBeVisible()
}

/** Waits for the autosave status to read "Đã lưu …". */
export async function expectSaved(page: Page) {
  await expect(page.getByText(/Đã lưu \d/)).toBeVisible()
}
