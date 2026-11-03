import { expect, test } from '@playwright/test'

import { pdfPages } from './helpers'

// Every page of both presets' PDF against the committed baseline (made by the app
// itself; refresh with `yarn test:e2e:update` after an intended drawing change).

for (const preset of ['hotel-9f', 'house-5f'] as const) {
  test(`${preset}: mỗi trang PDF khớp ảnh chuẩn`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto(`/dev/export?preset=${preset}`)
    await expect(page.locator('main[data-state="ready"]')).toBeVisible({
      timeout: 90_000,
    })
    const base64 = await page.evaluate(() => window.__pdf ?? '')
    const pngs = pdfPages(Buffer.from(base64, 'base64'))
    expect(pngs).toHaveLength(9)
    pngs.forEach((png, i) =>
      expect
        .soft(png)
        .toMatchSnapshot(`${preset}-${i + 1}.png`, {
          maxDiffPixelRatio: 0.001,
        }),
    )
  })
}
