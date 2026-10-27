import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Public URLs under test: every route in both locales (RULES 8.8), plus the bilingual 404 page.
// Later tasks extend this list.
const ROUTES = ['/en', '/th', '/en/does-not-exist'];

for (const route of ROUTES) {
  test(
    `axe: ${route} has no critical or serious violations`,
    { tag: '@a11y' },
    async ({ page }) => {
      await page.goto(route);

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
