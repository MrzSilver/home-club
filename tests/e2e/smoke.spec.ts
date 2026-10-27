import { expect, test } from '@playwright/test';

test.describe('smoke', () => {
  test('home loads with a lang attribute, a title, one h1 and a main landmark', async ({
    page,
  }) => {
    const response = await page.goto('/');

    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', /^[a-z]{2}/);
    await expect(page).toHaveTitle(/Home Club/);
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('responses carry the security headers (RULES 10.4)', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers() ?? {};

    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['content-security-policy']).not.toContain('unsafe-eval');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['x-powered-by']).toBeUndefined();
  });

  test('home renders without console errors or CSP violations', async ({ page }) => {
    const problems: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(message.text());
    });
    page.on('pageerror', (error) => problems.push(error.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(problems).toEqual([]);
  });
});
