import { expect, test, type Page } from '@playwright/test';

const LOCALES = ['en', 'th'] as const;
const CURRENCIES = ['USD', 'THB'] as const;

type Node = Record<string, unknown>;

async function jsonLd(page: Page): Promise<Node[]> {
  const bodies = await page.locator('script[type="application/ld+json"]').allTextContents();
  return bodies.flatMap((body) => {
    const parsed: unknown = JSON.parse(body);
    return (Array.isArray(parsed) ? parsed : [parsed]) as Node[];
  });
}

function types(nodes: Node[]): unknown[] {
  return nodes.map((node) => node['@type']);
}

function urls(value: unknown): string[] {
  if (typeof value === 'string') return /^https?:\/\//.test(value) ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(urls);
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(urls);
  return [];
}

function expectNoCurrencySegment(nodes: Node[]): void {
  const all = urls(nodes);
  expect(all.length).toBeGreaterThan(0);
  for (const url of all) expect(url).not.toMatch(/\/(usd|thb)(\/|$)/);
}

test.describe('JSON-LD structured data', () => {
  for (const locale of LOCALES) {
    test(`Home emits Organization and WebSite in ${locale} (FR-036)`, async ({ page }) => {
      await page.goto(`/${locale}`);
      const nodes = await jsonLd(page);

      expect(types(nodes)).toEqual(['Organization', 'WebSite']);
      expect(nodes[0]?.['name']).toBe('Home Club Foundation');
      expect(nodes[1]?.['inLanguage']).toBe(locale);
      expectNoCurrencySegment(nodes);
    });

    for (const currency of CURRENCIES) {
      test(`Product emits Product, Offer in ${currency} and BreadcrumbList in ${locale} (FR-036)`, async ({
        page,
        context,
        baseURL,
      }) => {
        await context.addCookies([{ name: 'hc_currency', value: currency, url: baseURL ?? '' }]);
        await page.goto(`/${locale}/products/essential-tee`);
        const nodes = await jsonLd(page);

        expect(types(nodes)).toEqual(['Product', 'BreadcrumbList']);
        const offers = nodes[0]?.['offers'] as Node;
        expect(offers['@type']).toBe('Offer');
        expect(offers['priceCurrency']).toBe(currency);
        expect(offers['price']).toMatch(/^\d+(\.\d{2})?$/);
        const crumbs = nodes[1]?.['itemListElement'] as Node[];
        expect(crumbs.map((crumb) => crumb['position'])).toEqual([1, 2, 3, 4]);
        expect(String(crumbs[1]?.['item'])).toMatch(new RegExp(`/${locale}/shop$`));
        expect(String(crumbs[2]?.['item'])).toMatch(
          new RegExp(`/${locale}/collections/foundations$`),
        );
        expectNoCurrencySegment(nodes);
      });
    }
  }

  for (const path of ['/shop', '/collections/foundations']) {
    test(`${path} emits a BreadcrumbList (FR-036)`, async ({ page }) => {
      await page.goto(`/en${path}`);
      const nodes = await jsonLd(page);

      expect(types(nodes)).toEqual(['BreadcrumbList']);
      expectNoCurrencySegment(nodes);
    });
  }

  for (const locale of LOCALES) {
    test(`Journal article emits Article without invented dates in ${locale} (FR-036)`, async ({
      page,
    }) => {
      await page.goto(`/${locale}/journal/everyday-layers`);
      const nodes = await jsonLd(page);

      expect(types(nodes)).toEqual(['Article', 'BreadcrumbList']);
      expect(nodes[0]).not.toHaveProperty('datePublished');
      expect(nodes[0]?.['inLanguage']).toBe(locale);
      expectNoCurrencySegment(nodes);
    });
  }

  test('structured data adds no console error or CSP violation (FR-036)', async ({ page }) => {
    const problems: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(message.text());
    });
    page.on('pageerror', (error) => problems.push(error.message));
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (event) => {
        console.error(`CSP violation: ${event.violatedDirective} ${event.blockedURI}`);
      });
    });

    for (const path of ['/en', '/th/products/essential-tee', '/en/journal/everyday-layers']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
    }

    expect(problems).toEqual([]);
  });
});
