import { expect, test } from '@playwright/test';

const LOCALES = ['en', 'th'] as const;

test.describe('smoke', () => {
  for (const locale of LOCALES) {
    test(`/${locale} loads with a lang attribute, a title, one h1 and a main landmark`, async ({
      page,
    }) => {
      const response = await page.goto(`/${locale}`);

      expect(response?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page).toHaveTitle(/Home Club/);
      await expect(page.getByRole('main')).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    });
  }

  test('responses carry the security headers (RULES 10.4)', async ({ page }) => {
    const response = await page.goto('/en');
    const headers = response?.headers() ?? {};

    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['content-security-policy']).not.toContain('unsafe-eval');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['x-powered-by']).toBeUndefined();
  });

  for (const locale of LOCALES) {
    test(`/${locale} renders without console errors or CSP violations`, async ({ page }) => {
      const problems: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') problems.push(message.text());
      });
      page.on('pageerror', (error) => problems.push(error.message));
      // A blocked eval (for example Zod's Function("") probe leaking into a client bundle) raises this
      // event but no console error, and shows up as a Lighthouse best-practices issue.
      await page.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (event) => {
          console.error(`CSP violation: ${event.violatedDirective} ${event.blockedURI}`);
        });
      });

      await page.goto(`/${locale}`);
      await page.waitForLoadState('networkidle');

      expect(problems).toEqual([]);
    });
  }
});
