import { expect, test, type APIRequestContext } from '@playwright/test';

type Head = {
  titles: string[];
  tags: Map<string, string[]>;
  alternates: Map<string, string>;
};

function attrs(tag: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const [, name, value] of tag.matchAll(/([a-zA-Z:-]+)="([^"]*)"/g)) {
    found.set((name ?? '').toLowerCase(), value ?? '');
  }
  return found;
}

function decode(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");
}

/** Reads the SEO tags out of the server-rendered <head> with plain regexes (no parser dependency). */
function parseHead(html: string): Head {
  const head = html.match(/<head[\s\S]*?<\/head>/)?.[0] ?? '';
  const titles = [...head.matchAll(/<title>([\s\S]*?)<\/title>/g)].map((m) => decode(m[1] ?? ''));
  const tags = new Map<string, string[]>();
  const alternates = new Map<string, string>();
  for (const [tag] of head.matchAll(/<(?:meta|link)\s[^>]*>/g)) {
    const a = attrs(tag);
    const key = a.get('name') ?? a.get('property');
    if (tag.startsWith('<meta') && key !== undefined) {
      tags.set(key, [...(tags.get(key) ?? []), decode(a.get('content') ?? '')]);
    } else if (tag.startsWith('<link')) {
      const rel = a.get('rel');
      const href = a.get('href') ?? '';
      if (rel === 'canonical') tags.set('canonical', [...(tags.get('canonical') ?? []), href]);
      if (rel === 'alternate' && a.has('hreflang')) alternates.set(a.get('hreflang') ?? '', href);
    }
  }
  return { titles, tags, alternates };
}

function first(head: Head, key: string): string {
  return head.tags.get(key)?.[0] ?? '';
}

function pathOf(url: string): string {
  return new URL(url).pathname;
}

async function fetchHead(request: APIRequestContext, path: string): Promise<Head> {
  const response = await request.get(path);
  expect(response.status(), path).toBe(200);
  return parseHead(await response.text());
}

async function sitemapPaths(request: APIRequestContext): Promise<string[]> {
  const xml = await (await request.get('/sitemap.xml')).text();
  const urls = [...xml.matchAll(/<url>[\s\S]*?<loc>([^<]+)<\/loc>/g)].map((m) => m[1] ?? '');
  expect(urls.length).toBeGreaterThan(0);
  return urls.map(pathOf);
}

// Small parallel batches: a sequential loop of every URL timed out on mobile under load, and one burst
// of all of them would be a load test.
async function inBatches<T>(items: string[], work: (item: string) => Promise<T>): Promise<T[]> {
  const out: T[] = [];
  for (let start = 0; start < items.length; start += 8) {
    out.push(...(await Promise.all(items.slice(start, start + 8).map(work))));
  }
  return out;
}

const OG_LOCALE = { en: 'en_US', th: 'th_TH' } as const;

test.describe('page metadata (FR-071, PRD §8 SEO)', () => {
  test('every sitemap URL carries complete, unique, currency-free metadata (FR-071)', async ({
    request,
  }) => {
    test.setTimeout(240_000);
    const paths = await sitemapPaths(request);
    const heads = await inBatches(
      paths,
      async (path) => [path, await fetchHead(request, path)] as const,
    );

    for (const [path, head] of heads) {
      const locale = path.split('/')[1] === 'th' ? 'th' : 'en';
      expect(head.titles, `${path} title count`).toHaveLength(1);
      expect(head.titles[0], `${path} title`).not.toBe('');
      expect(first(head, 'description'), `${path} description`).not.toBe('');

      const canonical = first(head, 'canonical');
      expect(pathOf(canonical), `${path} canonical`).toBe(path);
      for (const lang of ['en', 'th', 'x-default']) {
        expect(head.alternates.has(lang), `${path} hreflang ${lang}`).toBe(true);
      }
      expect(first(head, 'og:title'), `${path} og:title`).not.toBe('');
      expect(first(head, 'og:description'), `${path} og:description`).not.toBe('');
      expect(first(head, 'og:url'), `${path} og:url`).toBe(canonical);
      expect(first(head, 'og:type'), `${path} og:type`).not.toBe('');
      expect(first(head, 'og:site_name'), `${path} og:site_name`).not.toBe('');
      expect(first(head, 'og:locale'), `${path} og:locale`).toBe(OG_LOCALE[locale]);
      expect(first(head, 'twitter:card'), `${path} twitter:card`).toBe('summary_large_image');

      const urls = [canonical, first(head, 'og:url'), ...head.alternates.values()];
      for (const url of urls)
        expect(url, `${path} currency segment`).not.toMatch(/\/(usd|thb)(\/|$)/);
    }

    const byTitle = new Map<string, string[]>();
    const byDescription = new Map<string, string[]>();
    for (const [path, head] of heads) {
      const title = head.titles[0] ?? '';
      const description = first(head, 'description');
      byTitle.set(title, [...(byTitle.get(title) ?? []), path]);
      byDescription.set(description, [...(byDescription.get(description) ?? []), path]);
    }
    const duplicates = (groups: Map<string, string[]>): [string, string[]][] =>
      [...groups].filter(([, list]) => list.length > 1);
    expect(duplicates(byTitle), 'pages sharing a title').toEqual([]);
    expect(duplicates(byDescription), 'pages sharing a description').toEqual([]);
  });

  test('a filtered catalogue URL keeps the clean canonical and hreflang alternates (FR-071)', async ({
    request,
  }) => {
    const head = await fetchHead(request, '/en/shop?color=black&sort=price-asc');
    expect(pathOf(first(head, 'canonical'))).toBe('/en/shop');
    expect(first(head, 'canonical')).not.toContain('?');
    expect(pathOf(head.alternates.get('en') ?? '')).toBe('/en/shop');
    expect(pathOf(head.alternates.get('th') ?? '')).toBe('/th/shop');
    expect(pathOf(head.alternates.get('x-default') ?? '')).toBe('/en/shop');
  });

  for (const page of ['cart', 'search', 'checkout', 'checkout/success']) {
    test(`/en/${page} is kept out of the index but its links are followed (FR-071)`, async ({
      request,
    }) => {
      const head = await fetchHead(request, `/en/${page}`);
      const robots = first(head, 'robots');
      expect(robots).toContain('noindex');
      expect(robots).toContain('follow');
      expect(robots).not.toContain('nofollow');
    });
  }

  test('a journal article declares og:type article, other pages website (FR-071)', async ({
    request,
  }) => {
    const paths = await sitemapPaths(request);
    const article = paths.find((path) => path.startsWith('/en/journal/'));
    expect(article).toBeDefined();
    const head = await fetchHead(request, article ?? '');
    expect(first(head, 'og:type')).toBe('article');
    expect(first(await fetchHead(request, '/en/shop'), 'og:type')).toBe('website');
  });
});
