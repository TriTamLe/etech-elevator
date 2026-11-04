import { expect, test } from '@playwright/test'

import { createProject, field, open, uniqueName } from './helpers'

// Keyboard shortcuts: ⌘/Ctrl S saves now, "/" focuses the project search.

test('⌘/Ctrl S lưu ngay, không chờ 1,5 s', async ({ page }) => {
  await createProject(page, uniqueName('E2E PHÍM TẮT'))
  await field(page, 'tech.loadKg').fill('750')
  await expect(page.getByText('Chưa lưu…')).toBeVisible()
  await page.keyboard.press('ControlOrMeta+s')
  // Well inside the 1.5 s autosave delay.
  await expect(page.getByText(/Đã lưu \d/)).toBeVisible({ timeout: 1000 })
})

test('"/" đưa con trỏ vào ô tìm dự án', async ({ page }) => {
  await open(page, '/')
  await page.keyboard.press('/')
  await expect(page.getByLabel('Tìm dự án')).toBeFocused()
  // Typing "/" in the box itself is just text.
  await page.keyboard.type('a/b')
  await expect(page.getByLabel('Tìm dự án')).toHaveValue('a/b')
})
