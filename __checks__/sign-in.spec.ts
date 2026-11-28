import { expect, test } from '@playwright/test'
import { SITE_URL } from './site'

// The sign-in page loads in a real browser and offers Discord sign-in (sign-in.check.ts runs it every hour).
test('sign-in page loads', async ({ page }) => {
  const response = await page.goto(`${SITE_URL}/login`)
  expect(response?.status()).toBeLessThan(400)
  await expect(page.getByRole('link', { name: 'Continue with Discord' })).toBeVisible()
})
