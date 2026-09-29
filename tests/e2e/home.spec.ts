import { expect, test } from '@playwright/test'

test('home page loads and shows product statement', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/ImageLite/)
  await expect(
    page.getByRole('heading', { name: 'Compress images without uploading them' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: /Upload images/i })).toBeVisible()
})
