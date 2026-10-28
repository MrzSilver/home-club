import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Public URLs under test: every route in both locales (RULES 8.8), plus the bilingual 404 page.
// Later tasks extend this list.
const ROUTES = [
  '/en/products/essential-tee',
  '/th/products/essential-tee',
  '/en/cart',
  '/th/cart',
  '/en',
  '/th',
  '/en/does-not-exist',
  '/en/shop',
  '/th/shop',
  '/en/collections/foundations',
  '/th/collections/lifestyle',
  // Collection states that carry a query string: active chips and the empty state (T08).
  '/en/shop?color=black&size=M&minPrice=50&priceCurrency=usd&sort=price-asc',
  '/th/shop?category=accessories&size=XXL',
];

for (const route of ROUTES) {
  test(
    `axe: ${route} has no critical or serious violations`,
    { tag: '@a11y' },
    async ({ page }) => {
      await page.goto(route);
      // Wait for hydration: a filtered collection URL is only rendered as filtered once React has run.
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      const blocking = results.violations.filter(
        (violation) => violation.impact === 'critical' || violation.impact === 'serious',
      );
      expect(
        blocking.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          nodes: violation.nodes.length,
        })),
      ).toEqual([]);
    },
  );
}

// The menu drawer is part of every page (T06): axe sweeps it open, in both locales.
for (const locale of ['en', 'th'] as const) {
  test(
    `axe: /${locale} with the menu open has no critical or serious violations`,
    { tag: '@a11y' },
    async ({ page }) => {
      await page.goto(`/${locale}`);
      await page.getByRole('button', { name: locale === 'en' ? 'Open menu' : 'เปิดเมนู' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      const blocking = results.violations.filter(
        (violation) => violation.impact === 'critical' || violation.impact === 'serious',
      );
      expect(
        blocking.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          nodes: violation.nodes.length,
        })),
      ).toEqual([]);
    },
  );
}

// T08: the filters drawer is a modal dialog below the sidebar breakpoint (lg): axe sweeps it open, with
// a filter applied, in both locales.
for (const locale of ['en', 'th'] as const) {
  test.describe(`filters drawer /${locale}`, () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test(
      `axe: /${locale}/shop with the filters drawer open has no critical or serious violations`,
      { tag: '@a11y' },
      async ({ page }) => {
        await page.goto(`/${locale}/shop?color=black`);
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: locale === 'en' ? /^Filters/ : /^ตัวกรอง/ }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        // Let the slide-in animation finish: axe must not measure contrast mid-transition.
        await page.waitForTimeout(600);

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();

        const blocking = results.violations.filter(
          (violation) => violation.impact === 'critical' || violation.impact === 'serious',
        );
        expect(
          blocking.map((violation) => ({
            id: violation.id,
            impact: violation.impact,
            nodes: violation.nodes.length,
          })),
        ).toEqual([]);
      },
    );
  });
}
