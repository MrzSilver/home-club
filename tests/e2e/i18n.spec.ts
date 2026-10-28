import { expect, test, type Page } from '@playwright/test';

// T03: locale routing, the hidden currency segment and translated chrome (FR-070 to FR-073, FR-002, FR-004).
// The first Essentials card on the home page is the essential tee: 4900 USD cents = 49.00 USD = 1715 THB.
const USD_PRICE = '$49.00';
const THB_PRICE = '฿1,715';
// Thai-locale formatting of US dollars keeps the "US" prefix to tell them from other dollars.
const USD_PRICE_ON_THAI_PAGE = 'US$49.00';

const price = (page: Page): ReturnType<Page['getByTestId']> =>
  page.getByTestId('product-price').first();

test.describe('locale routing (FR-071)', () => {
  test('/ goes to /en when the browser has no Thai preference', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/en$/);
  });

  test.describe('with a Thai browser', () => {
    test.use({ locale: 'th-TH' });

    test('/ goes to /th (Accept-Language)', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveURL(/\/th$/);
      await expect(page.locator('html')).toHaveAttribute('lang', 'th');
    });

    test('the NEXT_LOCALE cookie from an earlier visit wins over Accept-Language (FR-002)', async ({
      page,
    }) => {
      await page.goto('/en');
      await page.goto('/');
      await expect(page).toHaveURL(/\/en$/);
    });
  });

  test('<html lang> follows the URL', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.goto('/th');
    await expect(page.locator('html')).toHaveAttribute('lang', 'th');
  });

  test('pages are titled and described in their own language, with public hreflang alternates', async ({
    page,
    baseURL,
  }) => {
    await page.goto('/th');
    await expect(page).toHaveTitle('Home Club Foundation (ร้านตัวอย่าง)');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      /ร้านเสื้อผ้าออนไลน์ตัวอย่าง/,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${baseURL}/th`);
    for (const [hreflang, href] of [
      ['en', `${baseURL}/en`],
      ['th', `${baseURL}/th`],
      ['x-default', `${baseURL}/en`],
    ] as const) {
      await expect(page.locator(`link[rel="alternate"][hreflang="${hreflang}"]`)).toHaveAttribute(
        'href',
        href,
      );
    }
    await page.goto('/en');
    await expect(page).toHaveTitle('Home Club Foundation (demo store)');
  });

  test('an unknown locale ends in the 404 page', async ({ page }) => {
    const response = await page.goto('/fr');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      /We could not find that page/i,
    );
  });

  test('a 404 is not cached for a year (no unbounded cache entries for junk URLs)', async ({
    request,
  }) => {
    for (const path of ['/en/does-not-exist-a', '/th/does-not-exist-b', '/en/x/y/z']) {
      const response = await request.get(path);
      expect(response.status()).toBe(404);
      const cacheControl = response.headers()['cache-control'] ?? '';
      expect(cacheControl).not.toMatch(/s-maxage|max-age=[1-9]/);
      expect(cacheControl).toMatch(/no-store|no-cache|private/);
    }
  });
});

test.describe('404 page without JavaScript (PRD 8 resilience)', () => {
  test.use({ javaScriptEnabled: false });

  for (const path of ['/en/does-not-exist', '/th/does-not-exist', '/robots-are-not-here.txt']) {
    test(`${path} is server-rendered in both languages`, async ({ page, request }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);

      // The server HTML itself, not a hydrated DOM: JavaScript is off for this page.
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page).toHaveTitle('Page not found / ไม่พบหน้าที่คุณต้องการ');
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        'We could not find that page',
      );
      await expect(page.getByRole('heading', { level: 1 })).toHaveAttribute('class', /text-h1/);
      await expect(page.locator('section[lang="en"] h1')).toHaveCount(1);
      await expect(page.locator('section[lang="th"] h2')).toHaveText('ไม่พบหน้าที่คุณต้องการ');
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('section[lang="en"] a')).toHaveAttribute('href', '/en');
      await expect(page.locator('section[lang="th"] a')).toHaveAttribute('href', '/th');

      // Stylesheet and fonts are applied: canvas background and the display font on the h1.
      await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(247, 244, 239)');
      await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('font-family', /jost/i);

      // Same bytes for a crawler that never runs a script.
      const html = await (await request.get(path)).text();
      expect(html).toContain('We could not find that page');
      expect(html).toContain('ไม่พบหน้าที่คุณต้องการ');
    });
  }
});

test.describe('404 navigation (FR-071)', () => {
  test('the Thai block links to the Thai home page', async ({ page }) => {
    await page.goto('/en/does-not-exist');
    await page.getByRole('link', { name: 'กลับไปหน้าแรก' }).click();
    await expect(page).toHaveURL(/\/th$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'th');
  });

  test('the English block links to the English home page', async ({ page }) => {
    await page.goto('/th/does-not-exist');
    await page.getByRole('link', { name: 'Back to the home page' }).click();
    await expect(page).toHaveURL(/\/en$/);
  });
});

test.describe('currency segment (FR-072, ADR-0003)', () => {
  test('/en shows USD and /th shows THB with no cookie', async ({ page }) => {
    await page.goto('/en');
    await expect(price(page)).toHaveText(USD_PRICE);
    await page.goto('/th');
    await expect(price(page)).toHaveText(THB_PRICE);
  });

  test('the hc_currency cookie overrides the locale default, and the URL stays public', async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([{ name: 'hc_currency', value: 'THB', url: baseURL ?? '' }]);
    await page.goto('/en');
    await expect(price(page)).toHaveText(THB_PRICE);
    expect(new URL(page.url()).pathname).toBe('/en');

    await context.addCookies([{ name: 'hc_currency', value: 'USD', url: baseURL ?? '' }]);
    await page.goto('/th');
    await expect(price(page)).toHaveText(USD_PRICE_ON_THAI_PAGE);
    expect(new URL(page.url()).pathname).toBe('/th');
  });

  test('an invalid hc_currency cookie is ignored', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'hc_currency', value: 'EUR', url: baseURL ?? '' }]);
    await page.goto('/en');
    await expect(price(page)).toHaveText(USD_PRICE);
  });

  test('the query string survives the rewrite', async ({ page }) => {
    await page.goto('/th?utm=demo');
    expect(new URL(page.url()).search).toBe('?utm=demo');
    await expect(price(page)).toHaveText(THB_PRICE);
  });

  for (const internal of ['/en/usd', '/en/thb', '/th/usd', '/th/thb']) {
    test(`${internal} redirects (308) to the public URL`, async ({ page }) => {
      const response = await page.goto(internal);
      const redirect = response?.request().redirectedFrom();
      expect((await redirect?.response())?.status()).toBe(308);
      expect(new URL(page.url()).pathname).toBe(internal.slice(0, 3));
    });
  }

  test('a deeper internal path redirects to its public form and then 404s as a normal unknown page', async ({
    page,
  }) => {
    const response = await page.goto('/en/thb/does-not-exist');
    expect(new URL(page.url()).pathname).toBe('/en/does-not-exist');
    expect(response?.status()).toBe(404);
  });
});

test.describe('translated chrome (FR-004, FR-070)', () => {
  test('the skip link is translated and reachable first', async ({ page }) => {
    await page.goto('/th');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'ข้ามไปยังเนื้อหาหลัก' })).toBeFocused();

    await page.goto('/en');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  });

  test('the Thai locale label on an English page and the Latin wordmark on a Thai page keep their own lang (FR-073)', async ({
    page,
  }) => {
    await page.goto('/en');
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.getByText('ไทย', { exact: true })).toHaveAttribute('lang', 'th');

    await page.goto('/th');
    await page.getByRole('button', { name: 'เปิดเมนู' }).click();
    await expect(page.getByText('English', { exact: true })).toHaveAttribute('lang', 'en');
    await page.keyboard.press('Escape');
    const brand = page.getByRole('banner').locator('[lang="en"]', { hasText: 'Home Club' }).first();
    await expect(brand).toHaveCSS('text-transform', 'uppercase');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('text-transform', 'none');
  });

  test('Thai headings use Noto Sans Thai and the Thai line height (FR-073)', async ({ page }) => {
    await page.goto('/th');
    await page.evaluate(() => document.fonts.ready);
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toHaveCSS('font-family', /notoSansThai/);
    const { lineHeight, fontSize } = await h1.evaluate((node) => {
      const style = getComputedStyle(node);
      return { lineHeight: parseFloat(style.lineHeight), fontSize: parseFloat(style.fontSize) };
    });
    expect(lineHeight / fontSize).toBeCloseTo(1.25, 2);
  });
});

test.describe('pathname on rewritten pages (ADR-0003)', () => {
  for (const [locale, other] of [
    ['en', 'th'],
    ['th', 'en'],
  ] as const) {
    test(`/${locale}: islands that read usePathname agree between the server HTML and the browser, with no hydration error`, async ({
      page,
      request,
    }) => {
      const problems: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning') {
          problems.push(message.text());
        }
      });
      page.on('pageerror', (error) => problems.push(error.message));

      // The header island reads the pathname: if the server saw the rewritten path (/usd) it would
      // disagree with the browser and hydration would fail.
      const html = await (await request.get(`/${locale}`)).text();
      expect(html).toContain('data-header-sentinel');
      expect(html).not.toMatch(/href="\/(en|th)\/(usd|thb)/);

      await page.goto(`/${locale}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('banner')).not.toHaveAttribute('data-past-hero');
      await page.getByRole('button', { name: locale === 'en' ? 'Open menu' : 'เปิดเมนู' }).click();
      await expect(page.locator(`ul a[lang="${other}"]`)).toHaveAttribute('href', `/${other}`);
      await expect(page.locator(`ul a[lang="${locale}"]`)).toHaveAttribute('href', `/${locale}`);
      await expect(page.locator(`ul a[lang="${locale}"]`)).toHaveAttribute('aria-current', 'true');
      expect(problems).toEqual([]);
    });
  }

  test('following the locale link lands on the other public home page and keeps the currency cookie', async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([{ name: 'hc_currency', value: 'THB', url: baseURL ?? '' }]);
    await page.goto('/en');
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.locator('ul a[lang="th"]').click();
    await expect(page).toHaveURL(/\/th$/);
    await expect(price(page)).toHaveText(THB_PRICE);
  });
});

test.describe('Thai font loading causes no layout shift (FR-073, ADR-0001)', () => {
  for (const locale of ['en', 'th'] as const) {
    test(`/${locale} accumulates a negligible layout shift while fonts load`, async ({
      page,
    }, testInfo) => {
      await page.addInitScript(() => {
        const holder = window as unknown as { __shift: number };
        holder.__shift = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
            if (!shift.hadRecentInput) holder.__shift += shift.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
      });
      await page.goto(`/${locale}`);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForLoadState('networkidle');

      const shift = await page.evaluate(() => (window as unknown as { __shift: number }).__shift);
      // ADR-0001 (T07 r2): /th on desktop may shift by about 0.018 when Noto Sans Thai swaps in under
      // the display headline (no headline preload); the budget is 0.1. Everything else stays under 0.01.
      const limit = locale === 'th' && testInfo.project.name === 'desktop' ? 0.02 : 0.01;
      expect(shift).toBeLessThan(limit);
    });
  }
});
