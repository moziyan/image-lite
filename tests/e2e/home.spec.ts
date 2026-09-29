import { expect, test } from '@playwright/test'

test('home page loads and shows product statement', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/ImageLite/)
  await expect(page.getByRole('heading', { name: 'ImageLite' })).toBeVisible()
})
