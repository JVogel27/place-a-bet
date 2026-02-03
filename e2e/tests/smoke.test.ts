import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('app loads and displays title', async ({ page }) => {
    await page.goto('/');

    // Check that the main title is visible
    await expect(page.getByRole('heading', { name: /Place-A-Bet/ })).toBeVisible();

    // Check that the description is visible
    await expect(page.getByText('A simple betting app for parties and events')).toBeVisible();
  });

  test('API connection works', async ({ page }) => {
    await page.goto('/');

    // Wait for API status to update
    await expect(page.getByText(/API Status:/)).toBeVisible();
    await expect(page.getByText(/API is working!/)).toBeVisible({ timeout: 5000 });
  });

  test('app is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Check that content is still visible on mobile
    await expect(page.getByRole('heading', { name: /Place-A-Bet/ })).toBeVisible();
  });
});
