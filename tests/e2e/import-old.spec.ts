import { expect, test } from '@playwright/test'

import { field, open } from './helpers'

// A JSON export from schema v1 (before "Hạng mục" was a field) imports and opens
// upgraded: the migrate() step fills in "THANG MÁY".

test('nhập file JSON schema v1: tự nâng cấp và mở được', async ({ page }) => {
  await open(page, '/')
  // The empty list has a second "Nhập JSON" (empty state); the toolbar one comes first.
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles('tests/e2e/fixtures/house-5f-v1.json')
  await page.waitForURL(/\/projects\//)
  await expect(field(page, 'project.name')).toHaveValue('DỰ ÁN CŨ (SCHEMA V1)')
  await expect(field(page, 'project.titleBlockPart')).toHaveValue('THANG MÁY')
})
