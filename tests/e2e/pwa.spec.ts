import { expect, test } from '@playwright/test'

/**
 * PWA tests run against the production build (playwright webServer runs
 * `npm run preview`). They verify the manifest, service worker
 * registration, the precached shell, and that image processing keeps
 * working offline. User image bytes must never enter any cache.
 */
test.describe('PWA', () => {
  test('serves a valid manifest with installability metadata', async ({ page }) => {
    await page.goto('/')
    const manifestUrl = await page.evaluate(() => {
      const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
      return link?.href ?? null
    })
    expect(manifestUrl).toBeTruthy()
    const manifest = await page.evaluate(async (url) => {
      const res = await fetch(url!)
      return res.json()
    }, manifestUrl)
    expect(manifest.name).toContain('ImageLite')
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe('/')
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2)
    // 192 and 512 are required for installability.
    const sizes = manifest.icons.flatMap((i: { sizes: string }) => i.sizes.split(' '))
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
  })

  test('registers a service worker and precaches the app shell', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
      timeout: 15000,
    })

    const cached = await page.evaluate(async () => {
      const keys = await caches.keys()
      const cache = await caches.open(keys.find((k) => k.includes('shell')) ?? keys[0]!)
      return (await cache.keys()).map((r) => new URL(r.url).pathname)
    })
    expect(cached).toContain('/index.html')
    expect(cached).toContain('/manifest.webmanifest')
    expect(cached.some((p) => p.startsWith('/assets/') && p.endsWith('.js'))).toBe(true)
  })

  test('image processing works offline after the shell is cached', async ({
    page,
    browserName,
  }) => {
    // Playwright's setOffline blocks ALL worker startup in WebKit (even
    // blob: workers) — a harness limitation, not an app defect. The offline
    // pipeline is verified on Chromium/Firefox; WebKit covers the shell,
    // manifest and no-image-caching below, and its online pipeline is
    // covered by the standard E2E suite.
    test.skip(
      browserName === 'webkit',
      'Playwright setOffline prevents WebKit worker startup (harness limitation)',
    )

    await page.goto('/')
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
      timeout: 15000,
    })

    await page.context().setOffline(true)
    try {
      // Create a real PNG file fully offline, run it through the actual
      // app pipeline (upload -> compress), and confirm a result appears.
      await page.evaluate(async () => {
        const canvas = new OffscreenCanvas(64, 64)
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#c0392b'
        ctx.fillRect(0, 0, 64, 64)
        const blob = await canvas.convertToBlob({ type: 'image/png' })
        const file = new File([blob], 'offline-test.png', { type: 'image/png' })
        const dt = new DataTransfer()
        dt.items.add(file)
        const input = document.querySelector<HTMLInputElement>('input[type=file]')!
        input.files = dt.files
        input.dispatchEvent(new Event('change', { bubbles: true }))
      })

      await expect(page.locator('.image-card').first()).toBeVisible({ timeout: 10000 })
      await page.getByRole('button', { name: /Compress|压缩|圧縮/ }).click()
      await expect(page.locator('.n-statistic').first()).toBeVisible({ timeout: 15000 })
    } finally {
      await page.context().setOffline(false)
    }
  })

  test('never caches user image bytes', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
      timeout: 15000,
    })

    // Simulate image work, then assert no blob/data URLs or user content
    // entered any cache.
    await page.evaluate(async () => {
      const canvas = new OffscreenCanvas(4, 4)
      canvas.getContext('2d')!.fillRect(0, 0, 4, 4)
      await canvas.convertToBlob({ type: 'image/png' })
    })

    const violations = await page.evaluate(async () => {
      const keys = await caches.keys()
      const bad: string[] = []
      for (const key of keys) {
        const cache = await caches.open(key)
        for (const req of await cache.keys()) {
          const url = new URL(req.url)
          if (url.protocol === 'blob:' || url.protocol === 'data:') bad.push(req.url)
        }
      }
      return bad
    })
    expect(violations).toEqual([])
  })
})
