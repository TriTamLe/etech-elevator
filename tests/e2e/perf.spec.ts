import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { createProject, expectSaved, field, open, uniqueName } from './helpers'

// Performance targets (super-plan P12): preview < 100 ms per keystroke, 9-page export
// < 5 s, no PDF library on first load. Tagged @perf: run with `yarn test:e2e:perf`, kept
// out of `yarn test:e2e` because timings swing with machine load. Dev server numbers are
// an upper bound of the production build.

const PDF_LIBS = /jspdf|svg2pdf|html2canvas|purify/i

const median = (xs: Array<number>) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}
const p95 = (xs: Array<number>) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.ceil(s.length * 0.95) - 1)]
}

/** Keydown in the load field → next frame after the main sheet's DOM changed, in ms. */
async function keystrokeLatency(page: Page, key: string): Promise<number> {
  await page.evaluate(() => {
    const w = window as unknown as { __lat?: Promise<number> }
    const sheet = document.querySelector('[role="region"][aria-label^="Bản vẽ"]')
    if (!sheet) throw new Error('main sheet not found')
    w.__lat = new Promise<number>((resolve) => {
      let start = 0
      const onKey = () => {
        start = performance.now()
      }
      window.addEventListener('keydown', onKey, { capture: true, once: true })
      const mo = new MutationObserver(() => {
        if (!start) return
        mo.disconnect()
        requestAnimationFrame(() => resolve(performance.now() - start))
      })
      mo.observe(sheet, { subtree: true, childList: true, characterData: true })
    })
  })
  await page.keyboard.press(key)
  return page.evaluate(
    () => (window as unknown as { __lat: Promise<number> }).__lat,
  )
}

async function measureTyping(
  page: Page,
  rounds = 10,
  gap = 150,
): Promise<Array<number>> {
  const load = field(page, 'tech.loadKg')
  await load.fill('630')
  await load.press('End')
  const out: Array<number> = []
  for (let i = 0; i < rounds; i++) {
    // 630 → 6300 → 630 …: every keystroke changes the load printed on DTP 02.
    out.push(await keystrokeLatency(page, i % 2 === 0 ? '0' : 'Backspace'))
    await page.waitForTimeout(gap)
  }
  return out
}

test.describe('@perf', () => {
  test.describe.configure({ timeout: 180_000 })

  test('gõ phím: xem trước DTP 02 cập nhật dưới 100 ms', async ({ page }) => {
    await createProject(page, uniqueName('E2E PERF GÕ'), 'Khách sạn 9 tầng')
    await page.getByRole('button', { name: /^DTP 02/ }).click()
    await expect(
      page.getByRole('region', { name: /^Bản vẽ DTP 02/ }),
    ).toBeVisible()
    await measureTyping(page, 4) // warm-up (JIT, first renders)

    const normal = await measureTyping(page)
    // Pauses longer than the 300 ms thumbnail delay: keystrokes meet the strip redrawing.
    const paused = await measureTyping(page, 10, 400)
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    const slow = await measureTyping(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })

    const line = (xs: Array<number>) =>
      `median ${median(xs).toFixed(0)} ms · p95 ${p95(xs).toFixed(0)} ms`
    console.log(`[perf] typing        ${line(normal)}`)
    console.log(`[perf] typing 400 ms ${line(paused)}`)
    console.log(`[perf] typing CPU 4x ${line(slow)}`)
    // The last keystrokes still save (no request left in flight for the next test).
    await expectSaved(page)
    expect(median(normal)).toBeLessThan(100)
  })

  test('tải lần đầu không có thư viện PDF; xuất 9 trang dưới 5 s', async ({
    page,
  }) => {
    const requests: Array<string> = []
    page.on('request', (r) => requests.push(r.url()))

    await open(page, '/')
    await createProject(page, uniqueName('E2E PERF PDF'), 'Khách sạn 9 tầng')
    await expectSaved(page)
    expect(requests.filter((u) => PDF_LIBS.test(u))).toEqual([])

    const pdf = page.getByRole('button', { name: 'Tải PDF' })
    const times: Array<number> = []
    for (let i = 0; i < 2; i++) {
      await page.evaluate(() => performance.clearMeasures())
      const t0 = Date.now()
      const download = page.waitForEvent('download', { timeout: 60_000 })
      await pdf.click()
      await download
      times.push(Date.now() - t0)
      const stages = await page.evaluate(() =>
        performance
          .getEntriesByType('measure')
          .filter((m) => m.name.startsWith('pdf:'))
          .map((m) => `${m.name} ${m.duration.toFixed(0)}`),
      )
      console.log(
        `[perf] export #${i + 1} ${times[i]} ms · ${stages.join(' · ') || '(no marks)'}`,
      )
      // The button reads "Tải PDF" again once the export has finished.
      await expect(pdf).not.toHaveAttribute('aria-busy', 'true')
    }
    expect(requests.some((u) => /jspdf/i.test(u))).toBe(true)
    for (const t of times) expect(t).toBeLessThan(5000)
  })
})
