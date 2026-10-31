import { expect, test, type APIRequestContext } from '@playwright/test';

// SEO NFR (SPEC 10): every shareable page names a localised 1200 x 630 PNG whose URL carries no
// currency segment and which the proxy serves without a redirect or a rewrite (docs/adr/0011).

const MAX_BYTES = 200 * 1024;
const PNG_SIGNATURE = '89504e470d0a1a0a';

const PAGES = [
  '/en',
  '/th',
  '/en/products/premium-hoodie',
  '/th/products/premium-hoodie',
  '/en/journal/everyday-layers',
  '/th/journal/everyday-layers',
] as const;

function metaContent(html: string, key: string): string {
  const tag = [...html.matchAll(/<meta\s[^>]*>/g)]
    .map(([value]) => value)
    .find((value) => new RegExp(`(?:property|name)="${key}"`).test(value));
  return tag?.match(/content="([^"]*)"/)?.[1] ?? '';
}

async function pageHead(request: APIRequestContext, path: string): Promise<string> {
  const response = await request.get(path);
  expect(response.status(), path).toBe(200);
  return response.text();
}

for (const path of PAGES) {
  test(`og:image and twitter:image name a currency-free absolute PNG on ${path} (SEO)`, async ({
    request,
  }) => {
    const html = await pageHead(request, path);
    const og = metaContent(html, 'og:image');
    const twitter = metaContent(html, 'twitter:image');
    expect(og).toMatch(/^https?:\/\//);
    expect(twitter).toBe(og);
    expect(new URL(og).pathname).not.toMatch(/\/(usd|thb)(\/|$)/);
    expect(new URL(og).pathname).toMatch(new RegExp(`^/${path.split('/')[1]}/og/`));
    expect(metaContent(html, 'og:image:width')).toBe('1200');
    expect(metaContent(html, 'og:image:height')).toBe('630');
    expect(metaContent(html, 'og:image:alt').length).toBeGreaterThan(0);
    expect(metaContent(html, 'twitter:image:alt')).toBe(metaContent(html, 'og:image:alt'));
  });

  test(`the image of ${path} is a 1200 x 630 PNG under 200 kB (SEO)`, async ({ request }) => {
    const og = metaContent(await pageHead(request, path), 'og:image');
    // The page URL host is the configured site URL, which is not necessarily the server under test.
    const response = await request.get(new URL(og).pathname, { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('image/png');
    const body = await response.body();
    expect(body.length).toBeLessThan(MAX_BYTES);
    expect(body.subarray(0, 8).toString('hex')).toBe(PNG_SIGNATURE);
    expect(body.readUInt32BE(16)).toBe(1200);
    expect(body.readUInt32BE(20)).toBe(630);
  });
}

test('a THB cookie and a Thai Accept-Language neither redirect nor rewrite an image (SEO)', async ({
  playwright,
  baseURL,
}) => {
  const context = await playwright.request.newContext({
    ...(baseURL === undefined ? {} : { baseURL }),
    extraHTTPHeaders: { 'Accept-Language': 'th', Cookie: 'hc_currency=THB' },
  });
  try {
    for (const path of ['/en/og/home.png', '/en/og/products/premium-hoodie/image.png']) {
      const response = await context.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(200);
      expect(response.headers()['content-type']).toBe('image/png');
    }
  } finally {
    await context.dispose();
  }
});

test('an unknown product or locale has no image (SEO)', async ({ request }) => {
  expect((await request.get('/en/og/products/nope/image.png')).status()).toBe(404);
  expect((await request.get('/fr/og/home.png', { maxRedirects: 0 })).status()).toBe(404);
});
