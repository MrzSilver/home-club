import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import p1 from '@docs/p1-deployed-audit.json';
import p3 from '@docs/p3-deployed-audit.json';

const LOCALES = ['en', 'th'] as const;
const NEW_TAB = { en: 'opens in a new tab', th: /แท็บใหม่/ } as const;

async function headingLevels(page: Page): Promise<number[]> {
  return page
    .locator('main')
    .locator('h1, h2, h3, h4, h5, h6')
    .evaluateAll((nodes) => nodes.map((node) => Number(node.tagName.slice(1))));
}

for (const locale of LOCALES) {
  test.describe(`case study /${locale} (FR-062)`, () => {
    test(`loads with 200, one h1 and no skipped heading levels (FR-062, ${locale})`, async ({
      page,
    }) => {
      const response = await page.goto(`/${locale}/case-study`);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);

      const levels = await headingLevels(page);
      expect(levels[0]).toBe(1);
      for (let i = 1; i < levels.length; i += 1) {
        expect((levels[i] ?? 0) - (levels[i - 1] ?? 0)).toBeLessThanOrEqual(1);
      }
    });

    test(`P3 table has one body row per route and the first row matches the stored audit (FR-062, ${locale})`, async ({
      page,
    }) => {
      await page.goto(`/${locale}/case-study`);
      const table = page.getByTestId('audit-p3');
      await expect(table.locator('caption')).toBeVisible();
      await expect(table.locator('tbody tr')).toHaveCount(p3.routes.length);
      expect(p3.routes).toHaveLength(8);

      const first = p3.routes[0];
      if (!first) throw new Error('p3 audit has no routes');
      const cells = table.locator('tbody tr').first().locator('th, td');
      await expect(cells.nth(0)).toHaveText(first.route);
      await expect(cells.nth(1)).toHaveText(String(Math.round(first.performance * 100)));
      await expect(cells.nth(2)).toHaveText(String(Math.round(first.accessibility * 100)));
      await expect(cells.nth(3)).toHaveText(String(Math.round(first.bestPractices * 100)));
      await expect(cells.nth(4)).toHaveText(String(Math.round(first.seo * 100)));
      await expect(cells.nth(5)).toContainText((first.lcpMs / 1000).toFixed(2));
      await expect(cells.nth(6)).toContainText(String(Math.round(first.tbtMs)));
      await expect(cells.nth(7)).toHaveText(first.cls.toFixed(3));
    });

    test(`external links open safely and say so (FR-062, ${locale})`, async ({ page }) => {
      await page.goto(`/${locale}/case-study`);
      const links = page.locator('main a[href^="https://"]');
      const hrefs = await links.evaluateAll((nodes) => nodes.map((n) => n.getAttribute('href')));
      expect(hrefs).toEqual(
        expect.arrayContaining([
          'https://github.com/MrzSilver/home-club',
          'https://home-club-eight.vercel.app',
          'https://github.com/MrzSilver/home-club/blob/main/docs/ASSETS.md',
        ]),
      );
      const count = await links.count();
      for (let i = 0; i < count; i += 1) {
        const link = links.nth(i);
        await expect(link).toHaveAttribute('rel', /noopener/);
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(link).toContainText(NEW_TAB[locale], { useInnerText: false });
      }
    });

    test(`the footer links to the case study (FR-062, ${locale})`, async ({ page }) => {
      await page.goto(`/${locale}`);
      await page.getByRole('contentinfo').locator('a[href$="/case-study"]').click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/case-study$`));
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    });

    test(
      `axe: /${locale}/case-study has no critical or serious violations (FR-062)`,
      { tag: '@a11y' },
      async ({ page }) => {
        await page.goto(`/${locale}/case-study`);
        await page.waitForLoadState('networkidle');
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
        const blocking = results.violations.filter(
          (v) => v.impact === 'critical' || v.impact === 'serious',
        );
        expect(blocking.map((v) => ({ id: v.id, nodes: v.nodes.length }))).toEqual([]);
      },
    );

    test(`renders without console errors or CSP violations (FR-062, ${locale})`, async ({
      page,
    }) => {
      const problems: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') problems.push(message.text());
      });
      page.on('pageerror', (error) => problems.push(error.message));
      await page.goto(`/${locale}/case-study`);
      await page.waitForLoadState('networkidle');
      expect(problems).toEqual([]);
    });
  });
}

for (const locale of LOCALES) {
  test(`the missed P1 LCP budget is stated visibly with its route (FR-062, ${locale})`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/case-study`);
    const failed = p1.failedAssertions[0];
    if (!failed) throw new Error('p1 audit has no failed assertion');
    const summary = page.getByTestId('audit-miss-summary');
    await expect(summary).toBeVisible();
    await expect(summary).toContainText(failed.route);
    await expect(summary).toContainText((failed.actualNumericValue / 1000).toFixed(2));
    await expect(summary).toContainText((failed.maxNumericValue / 1000).toFixed(2));
  });
}
