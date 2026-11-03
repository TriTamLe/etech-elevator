import { expect, test } from '@playwright/test'

import { field, open } from './helpers'

// A JSON export from schema v1 (before "Hạng mục" was a field) imports and opens
// upgraded: the migrate() step fills in "THANG MÁY".

test('nhập file JSON schema v1: tự nâng cấp và mở được', async ({ page }) => {
  await open(page, '/')
  await page
    .locator('input[type="file"]')
    .setInputFiles('tests/e2e/fixtures/house-5f-v1.json')
  await page.waitForURL(/\/projects\//)
  await expect(field(page, 'project.name')).toHaveValue('DỰ ÁN CŨ (SCHEMA V1)')
  await expect(field(page, 'project.titleBlockPart')).toHaveValue('THANG MÁY')
})
