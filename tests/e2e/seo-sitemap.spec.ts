import { expect, test } from '@playwright/test';
import { CATEGORY_ENTRIES } from '@/data/categories';
import { LOOKS } from '@/data/looks';
import { PRODUCTS } from '@/data/products';
import { VIBE_ENTRIES } from '@/data/vibes';

// Static pages (home, shop, looks, vibes, journal, case study) + the data-driven pages + 3 journal articles, in 2 locales.
const EXPECTED_URLS =
  (6 + CATEGORY_ENTRIES.length + PRODUCTS.length + LOOKS.length + VIBE_ENTRIES.length + 3) * 2;

const BLOCKED = ['cart', 'checkout', 'search'].flatMap((page) =>
  ['en', 'th'].map((locale) => `/${locale}/${page}`),
);

function pathOf(url: string): string {
  const { pathname, search } = new URL(url);
  return pathname + search;
}

test.describe('sitemap and robots (PRD SEO NFR, SPEC §10)', () => {
  test('sitemap.xml is XML and lists every indexable page with language alternates', async ({
    request,
  }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('xml');
    const xml = await response.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1] ?? '');
    expect(locs).toHaveLength(EXPECTED_URLS);
    expect(new Set(locs).size).toBe(locs.length);

    const hrefs = [...xml.matchAll(/<xhtml:link[^>]*href="([^"]+)"/g)].map((m) => m[1] ?? '');
    for (const url of [...locs, ...hrefs]) {
      expect(url).not.toMatch(/\/(usd|thb)(\/|$)/);
      expect(BLOCKED).not.toContain(pathOf(url));
    }

    const blocks = xml.match(/<url>[\s\S]*?<\/url>/g) ?? [];
    expect(blocks).toHaveLength(EXPECTED_URLS);
    for (const block of blocks) {
      for (const lang of ['en', 'th', 'x-default']) {
        expect(block).toContain(`hreflang="${lang}"`);
      }
    }
  });

  test('every sitemap URL resolves with 200 (SPEC §10)', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text();
    const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => pathOf(m[1] ?? ''));
    expect(paths.length).toBeGreaterThan(0);
    // Small parallel batches: one request at a time ran past the test timeout when the suite shares
    // the server with the other workers; a single burst of every URL would be a load test instead.
    const BATCH = 8;
    for (let start = 0; start < paths.length; start += BATCH) {
      const batch = paths.slice(start, start + BATCH);
      const statuses = await Promise.all(
        batch.map(async (path) => [path, (await request.get(path)).status()] as const),
      );
      for (const [path, status] of statuses) expect(status, path).toBe(200);
    }
  });

  test('robots.txt allows all, blocks cart/checkout/search per locale, and names the sitemap (SPEC §10)', async ({
    request,
  }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const lines = (await response.text()).split(/\r?\n/);
    expect(lines).toContain('Allow: /');
    for (const path of BLOCKED) expect(lines).toContain(`Disallow: ${path}`);
    expect(lines.filter((line) => line.startsWith('Disallow:'))).toHaveLength(BLOCKED.length);
    expect(lines).not.toContain('Disallow: /');
    expect(lines.some((line) => line.startsWith('Disallow:') && line.includes('?'))).toBe(false);
    expect(lines.some((line) => /^Sitemap: \S+\/sitemap\.xml$/.test(line))).toBe(true);
  });

  for (const path of ['/sitemap.xml', '/robots.txt']) {
    test(`${path} bypasses the proxy: no redirect or rewrite despite cookie and language (SPEC §4)`, async ({
      request,
    }) => {
      const response = await request.get(path, {
        maxRedirects: 0,
        headers: { 'Accept-Language': 'th', Cookie: 'hc_currency=THB' },
      });
      expect(response.status()).toBe(200);
      expect(new URL(response.url()).pathname).toBe(path);
    });
  }
});
