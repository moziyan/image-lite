import { expect, test } from '@playwright/test'

/**
 * Core compress pipeline through the real app, verified across all three
 * browser engines (chromium/firefox/webkit).
 */
test('upload an image and compress it end-to-end', async ({ page }) => {
  await page.goto('/')

  // Build a real PNG in-page and feed it through the file input.
  await page.evaluate(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#c0392b'
    ctx.fillRect(0, 0, 64, 64)
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), 'image/png'),
    )
    const file = new File([blob], 'e2e-test.png', { type: 'image/png' })
    const dt = new DataTransfer()
    dt.items.add(file)
    const input = document.querySelector<HTMLInputElement>('input[type=file]')!
    input.files = dt.files
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })

  await expect(page.locator('.image-card').first()).toBeVisible({ timeout: 10000 })
  await page.getByRole('button', { name: /Compress|压缩|圧縮/ }).click()

  // Result statistics appear (original, output, time) — PRODUCT.md §12.
  await expect(page.locator('.n-statistic').first()).toBeVisible({ timeout: 20000 })
  const stats = await page.evaluate(() =>
    [...document.querySelectorAll('.n-statistic')].map((s) =>
      s.textContent?.replace(/\s+/g, ' ').trim(),
    ),
  )
  expect(stats.length).toBeGreaterThanOrEqual(2)
  // A download button is offered for the result.
  await expect(page.getByRole('button', { name: /^Download$|^下载$|^ダウンロード$/ })).toBeVisible()
})
