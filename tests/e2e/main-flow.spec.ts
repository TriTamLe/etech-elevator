import { expect, test } from '@playwright/test'

import {
  createProject,
  expectSaved,
  field,
  pdfPageCount,
  uniqueName,
} from './helpers'

// The main flow: create → edit → autosave → version → restore → PDF.

test('tạo, sửa, tự lưu, lưu và khôi phục phiên bản, tải PDF', async ({
  page,
}) => {
  test.setTimeout(150_000)
  const name = uniqueName('E2E LUỒNG CHÍNH')
  await createProject(page, name)
  const load = field(page, 'tech.loadKg')

  // Edit, autosave, reload: the value is kept.
  await load.fill('630')
  await expectSaved(page)
  await page.reload()
  await expect(load).toHaveValue('630')

  // Save a version, change the value, restore the version.
  await page.locator('#editor-versions').click()
  const sheet = page.getByRole('dialog', { name: 'Phiên bản' })
  await sheet.getByLabel('Ghi chú').fill('Bản 630 kg')
  await sheet.getByRole('button', { name: 'Lưu phiên bản' }).click()
  await expect(page.getByText('Đã lưu phiên bản.')).toBeVisible()
  await page.keyboard.press('Escape')
  await load.fill('800')
  await expectSaved(page)
  await page.locator('#editor-versions').click()
  await sheet.getByRole('button', { name: 'Khôi phục' }).first().click()
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Khôi phục' })
    .click()
  await expect(load).toHaveValue('630')
  await expectSaved(page)

  // PDF: one download, named after the project, nine pages.
  const download = page.waitForEvent('download', { timeout: 90_000 })
  await page.getByRole('button', { name: 'Tải PDF' }).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(
    new RegExp(
      `^BV - .*${name.split(' ').at(-1)}.* - \\d{2}-\\d{2}-\\d{4}\\.pdf$`,
    ),
  )
  const path = await file.path()
  const { readFileSync } = await import('node:fs')
  expect(pdfPageCount(readFileSync(path))).toBe(9)
})
