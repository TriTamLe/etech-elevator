import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { createProject, open, uniqueName } from './helpers'

// Layout at phone, tablet and laptop widths: no horizontal page scroll, and below 768 px
// every visible control is a 44 px touch target. Screenshots land in test-results/ for
// the design audit (not committed).

const WIDTHS = [320, 375, 768, 1024]

async function expectNoSideScroll(page: Page) {
  const { scroll, inner } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    inner: window.innerWidth,
  }))
  expect(scroll).toBeLessThanOrEqual(inner)
}

/** Visible buttons, links and tabs shorter than 44 px (links inside running text excepted). */
function smallTargets(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('button, a[href], [role="tab"]')]
      .filter(
        (el) =>
          el.checkVisibility() &&
          !el.closest('p') &&
          // TanStack devtools (dev server only).
          !el.closest(
            '.tsqd-parent-container, [class*="tanstack-devtools"], [id*="devtools"]',
          ),
      )
      .map((el) => {
        const r = el.getBoundingClientRect()
        const name = (el.getAttribute('aria-label') ?? el.textContent).trim()
        return { name: name.slice(0, 40), h: Math.round(r.height), w: r.width }
      })
      // sr-only skip links etc. are 1 px boxes.
      .filter((t) => t.w > 1 && t.h < 44),
  )
}

for (const width of WIDTHS) {
  test.describe(`${width} px`, () => {
    test.use({ viewport: { width, height: 800 } })

    test('danh sách và màn soạn vừa khung, vùng bấm đủ lớn', async ({
      page,
    }, info) => {
      await createProject(page, uniqueName(`E2E RỘNG ${width}`))
      await expectNoSideScroll(page)
      if (width < 768) expect(await smallTargets(page)).toEqual([])
      await page.screenshot({ path: info.outputPath(`editor-${width}.png`) })

      await open(page, '/')
      await expect(page.locator('[data-row-id]:visible').first()).toBeVisible()
      await expectNoSideScroll(page)
      if (width < 768) expect(await smallTargets(page)).toEqual([])
      await page.screenshot({
        path: info.outputPath(`list-${width}.png`),
        fullPage: true,
      })
    })
  })
}
