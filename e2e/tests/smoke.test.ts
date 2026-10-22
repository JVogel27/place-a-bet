import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('app loads and displays title', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle('Place-A-Bet');
    await expect(page.getByRole('heading', { name: /Place-A-Bet/ })).toBeVisible();

    // The host toggle is the one control rendered whether or not a party is active
    await expect(page.getByRole('button', { name: /Host/ })).toBeVisible();
  });

  test('API connection works', async ({ page }) => {
    const partiesResponse = page.waitForResponse(res => res.url().endsWith('/api/parties'));
    await page.goto('/');

    const response = await partiesResponse;
    expect(response.ok()).toBe(true);
    expect(Array.isArray(await response.json())).toBe(true);

    // Once parties load, the loading screen gives way to the app
    await expect(page.getByText('Loading...')).toBeHidden();
  });

  test('app is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Check that content is still visible on mobile
    await expect(page.getByRole('heading', { name: /Place-A-Bet/ })).toBeVisible();
  });
});
