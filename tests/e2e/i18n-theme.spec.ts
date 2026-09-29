import { expect, test } from '@playwright/test'

test.describe('i18n', () => {
  test('defaults to a supported locale and can switch languages', async ({ page }) => {
    await page.goto('/')
    // Default detection: en-US unless the browser locale says otherwise.
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()

    // Switch to Chinese.
    await page.locator('.n-base-selection').first().click()
    await page.locator('.n-base-select-option:has-text("简体中文")').click()
    await expect(page.getByRole('heading', { name: '无需上传即可压缩图片' })).toBeVisible()
    await expect(page.getByRole('button', { name: /上传图片/ })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('zh-CN')

    // Switch to Japanese.
    await page.locator('.n-base-selection').first().click()
    await page.locator('.n-base-select-option:has-text("日本語")').click()
    await expect(page.getByRole('heading', { name: 'アップロードせずに画像を圧縮' })).toBeVisible()

    // Back to English.
    await page.locator('.n-base-selection').first().click()
    await page.locator('.n-base-select-option:has-text("English")').click()
    await expect(
      page.getByRole('heading', { name: 'Compress images without uploading them' }),
    ).toBeVisible()
  })

  test('persists the chosen locale across reloads', async ({ page }) => {
    await page.goto('/')
    await page.locator('.n-base-selection').first().click()
    await page.locator('.n-base-select-option:has-text("简体中文")').click()
    await expect(page.getByRole('heading', { name: '无需上传即可压缩图片' })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('heading', { name: '无需上传即可压缩图片' })).toBeVisible()
  })
})

test.describe('theme', () => {
  test('toggles dark mode and applies the dark class', async ({ page }) => {
    await page.goto('/')
    const isDarkBefore = await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    )

    // Theme toggle is the first button in the header (sun/moon icon).
    await page.locator('header button').first().click()

    const isDarkAfter = await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    )
    expect(isDarkAfter).toBe(!isDarkBefore)
  })
})
