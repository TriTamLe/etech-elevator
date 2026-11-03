import { expect, test } from '@playwright/test'

import { createProject, open, uniqueName } from './helpers'

// The project list: diacritic-insensitive search, delete with confirm + undo, duplicate.

test('tìm không dấu, xóa có xác nhận và hoàn tác, nhân bản', async ({
  page,
}) => {
  const name = uniqueName('CÔNG TRÌNH ĐÀ NẴNG')
  await createProject(page, name)
  await open(page, '/')

  // "da nang" finds "ĐÀ NẴNG" (đ→d, marks stripped).
  const suffix = name.split(' ').at(-1)!
  await page
    .getByLabel('Tìm dự án')
    .fill(`cong trinh da nang ${suffix.toLowerCase()}`)
  await expect(page).toHaveURL(/q=/)
  const row = page.locator('[data-row-id]:visible').filter({ hasText: name })
  await expect(row).toHaveCount(1)

  // Delete asks first, then still offers undo.
  await page.getByRole('button', { name: `Xóa “${name}”` }).click()
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Xóa' })
    .click()
  await expect(row).toHaveCount(0)
  await page.getByRole('button', { name: 'Hoàn tác' }).click()
  await expect(row).toHaveCount(1)

  // Duplicate makes a second row.
  await page.getByRole('button', { name: `Nhân bản “${name}”` }).click()
  await page.getByLabel('Tìm dự án').fill(suffix.toLowerCase())
  await expect(page.locator('[data-row-id]:visible')).toHaveCount(2)
})
