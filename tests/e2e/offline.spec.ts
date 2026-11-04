import { expect, test } from '@playwright/test'

import { createProject, expectSaved, field, uniqueName } from './helpers'

// Offline (PO 03/11): editing goes on, saves wait and resume by themselves, a banner says
// so, actions that need the server are disabled, leaving asks instead of hanging.

test('mất mạng: biểu ngữ, chờ lưu, hỏi khi rời trang, tự lưu khi có mạng lại', async ({
  page,
  context,
}) => {
  await createProject(page, uniqueName('E2E MẤT MẠNG'))
  await expectSaved(page)

  await context.setOffline(true)
  await expect(
    page.getByText('Mất mạng — sẽ tự lưu khi có mạng lại.'),
  ).toBeVisible()

  await field(page, 'tech.loadKg').fill('800')
  await expect(page.getByText('Mất mạng · chờ lưu')).toBeVisible()
  await expect(page.getByRole('button', { name: /^Tải PDF/ })).toHaveAttribute(
    'aria-disabled',
    'true',
  )

  // Leaving asks at once (it used to wait forever for the save).
  await page.getByRole('link', { name: 'Về danh sách dự án' }).click()
  const leave = page.getByRole('alertdialog')
  await expect(leave).toContainText('Đang mất mạng')
  await leave.getByRole('button', { name: 'Ở lại' }).click()
  await expect(leave).toBeHidden()

  await context.setOffline(false)
  await expectSaved(page)
  await page.reload()
  await expect(field(page, 'tech.loadKg')).toHaveValue('800')
})
