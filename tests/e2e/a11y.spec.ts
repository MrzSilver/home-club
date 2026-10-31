import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { allRoutes, NOT_FOUND_PATH, QUERY_STATE_ROUTES } from './routes';

// Public URLs under test: the manifest generates every route from the seed data in both locales
// (RULES 8.8), plus the bilingual 404 page. A new product, look, vibe or article is covered by adding it
// to the data; nothing is listed by hand here. Query-string states are listed separately.
const ROUTES = [...allRoutes(), ...QUERY_STATE_ROUTES];

/**
 * Console errors, warnings and page errors; hydration problems show up here (PRD 9). Chromium logs the
 * 404 status of the document itself as a console error, so that one message is expected on the 404 route.
 * Any other failed request (an image, a script, a font) is reported separately and always fails.
 */
function watchProblems(page: Page, expectDocument404: boolean): string[] {
  const problems: string[] = [];
  page.on('console', (message) => {
    const text = message.text();
    if (expectDocument404 && /Failed to load resource.*404/.test(text)) return;
    if (message.type() === 'error' || message.type() === 'warning') {
      problems.push(`${message.type()}: ${text}`);
    }
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('response', (response) => {
    const isDocument = response.request().resourceType() === 'document';
    if (response.status() >= 400 && !(isDocument && expectDocument404)) {
      problems.push(`failed request: ${response.status()} ${response.url()}`);
    }
  });
  return problems;
}

for (const route of ROUTES) {
  test(
    `axe: ${route} has no critical or serious violations and a clean console`,
    { tag: '@a11y' },
    async ({ page }) => {
      const problems = watchProblems(page, route.endsWith(`/${NOT_FOUND_PATH}`));
      // A blocked eval or inline script raises this event but no console error.
      await page.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (event) => {
          console.error(`CSP violation: ${event.violatedDirective} ${event.blockedURI}`);
        });
      });
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
      expect(problems).toEqual([]);
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
