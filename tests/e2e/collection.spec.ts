import { expect, test, type Locator, type Page } from '@playwright/test';

// T08: collection pages (FR-020, FR-021, FR-022, FR-070 to FR-072). The pages are static; the filters
// run in the browser from the URL (ADR-0006). Prices and counts below come from the seed catalogue.
const LOCALES = ['en', 'th'] as const;
type Locale = (typeof LOCALES)[number];

const COPY = {
  en: {
    title: 'Shop all',
    count: (n: number): string => (n === 1 ? '1 product' : `${n} products`),
    filtersButton: /^Filters/,
    filtersTitle: 'Filters',
    sort: 'Sort by',
    min: 'Min',
    max: 'Max',
    clearAll: 'Clear all',
    clearFilters: 'Clear filters',
    emptyTitle: 'No products match these filters',
    showResults: /^Show \d+ results?$/,
    activeFilters: 'Active filters',
    remove: (name: string): string => `Remove filter: ${name}`,
    home: 'Home',
    shop: 'Shop',
    breadcrumb: 'Breadcrumb',
    sorts: { asc: 'Price: low to high', desc: 'Price: high to low', newest: 'Newest' },
    black: 'Black',
    foundations: 'Foundations',
    lifestyle: 'Lifestyle',
    firstFeatured: 'Essential Tee',
    cheapest: 'Essential Crew Socks',
    dearest: 'Coach Jacket',
    newest: 'Canvas Tote',
    notFound: 'Page not found',
  },
  th: {
    title: 'สินค้าทั้งหมด',
    count: (n: number): string => `${n} รายการ`,
    filtersButton: /^ตัวกรอง/,
    filtersTitle: 'ตัวกรอง',
    sort: 'เรียงตาม',
    min: 'ต่ำสุด',
    max: 'สูงสุด',
    clearAll: 'ล้างทั้งหมด',
    clearFilters: 'ล้างตัวกรอง',
    emptyTitle: 'ไม่พบสินค้าที่ตรงกับตัวกรอง',
    showResults: /^ดู \d+ รายการ$/,
    activeFilters: 'ตัวกรองที่ใช้อยู่',
    remove: (name: string): string => `ลบตัวกรอง: ${name}`,
    home: 'หน้าแรก',
    shop: 'สินค้า',
    breadcrumb: 'เส้นทางหน้าเว็บ',
    sorts: { asc: 'ราคา: ต่ำไปสูง', desc: 'ราคา: สูงไปต่ำ', newest: 'ใหม่ล่าสุด' },
    black: 'ดำ',
    foundations: 'ไอเท็มพื้นฐาน',
    lifestyle: 'ไลฟ์สไตล์',
    firstFeatured: 'เสื้อยืดพื้นฐาน',
    cheapest: 'ถุงเท้าข้อกลางพื้นฐาน',
    dearest: 'แจ็กเก็ตโค้ช',
    newest: 'กระเป๋าผ้าแคนวาส',
    notFound: 'ไม่พบหน้าที่คุณต้องการ',
  },
} as const;

// The default currency follows the locale (en -> USD, th -> THB), and so do the price bounds in the URL.
const CURRENCY = { en: { tag: 'usd', min: 50, max: 90 }, th: { tag: 'thb', min: 1750, max: 3150 } };

/** Console errors, warnings and page errors; hydration problems show up here (RULES 4.6). */
function watchConsole(page: Page): string[] {
  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      problems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  return problems;
}

const isNarrow = (page: Page): boolean => (page.viewportSize()?.width ?? 0) < 1024;
const count = (page: Page): Locator => page.getByTestId('result-count');
const grid = (page: Page): Locator =>
  page.locator('[data-catalogue-pending] ul:not([aria-label]) > li');
const names = (page: Page): Promise<string[]> => grid(page).locator('h3').allTextContents();

/** The filter controls: the sidebar from lg up, otherwise the drawer, opened from the Filters button. */
async function openFilters(page: Page, locale: Locale): Promise<Locator> {
  if (!isNarrow(page)) return page.getByRole('complementary', { name: COPY[locale].filtersTitle });
  await page.getByRole('button', { name: COPY[locale].filtersButton }).click();
  const dialog = page.getByRole('dialog', { name: COPY[locale].filtersTitle });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function closeFilters(page: Page, locale: Locale): Promise<void> {
  if (!isNarrow(page)) return;
  await page.getByRole('button', { name: COPY[locale].showResults }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

/** Size chips hide their checkbox; a visitor clicks the chip, so the test does too. */
const chip = (scope: Locator, text: string): Locator =>
  scope.locator('label').filter({ hasText: new RegExp(`^${text}$`) });

for (const locale of LOCALES) {
  const copy = COPY[locale];
  const currency = CURRENCY[locale];

  test.describe(`/${locale}/shop`, () => {
    test('lists all 12 products with title, count, breadcrumb, sort and prices, and a clean console', async ({
      page,
    }) => {
      const problems = watchConsole(page);
      await page.goto(`/${locale}/shop`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('heading', { level: 1 })).toHaveText(copy.title);
      await expect(count(page)).toHaveText(copy.count(12));
      await expect(grid(page)).toHaveCount(12);
      expect((await names(page))[0]).toBe(copy.firstFeatured);
      const crumbs = page.getByRole('navigation', { name: copy.breadcrumb });
      await expect(crumbs.getByRole('link', { name: copy.home })).toHaveAttribute(
        'href',
        `/${locale}`,
      );
      await expect(crumbs.getByText(copy.shop)).toHaveAttribute('aria-current', 'page');
      await expect(page.getByLabel(copy.sort)).toHaveValue('featured');
      await expect(page.getByTestId('product-price').first()).toHaveText(
        locale === 'en' ? '$49.00' : '฿1,715',
      );
      expect(problems).toEqual([]);
    });

    test('has no horizontal overflow and keeps the 2-up, 3-up and 4-up grids', async ({ page }) => {
      await page.goto(`/${locale}/shop`);
      const width = page.viewportSize()?.width ?? 0;

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      const columns = await page
        .locator('[data-catalogue-pending] ul:not([aria-label])')
        .evaluate((list) => getComputedStyle(list).gridTemplateColumns.split(' ').length);
      expect(columns).toBe(width >= 1280 ? 4 : width >= 768 ? 3 : 2);
    });

    test('serves the full default grid and prices in the first HTML, with a preloaded first picture', async ({
      request,
    }) => {
      const html = await (await request.get(`/${locale}/shop`)).text();

      expect(html).toContain(locale === 'en' ? '$49.00' : '฿1,715');
      expect((html.match(/<h1/g) ?? []).length).toBe(1);
      expect((html.match(/href="\/\w{2}\/products\//g) ?? []).length).toBe(12);
      expect(html).toContain(copy.count(12));
      // The pre-paint hold is inserted once, in the head (ADR-0006), and not as part of the page tree.
      expect(
        html.match(/<script>\(function\(\)\{var p=new URLSearchParams\(location\.search\)/g),
      ).toHaveLength(1);
      expect(html.indexOf('catalogue-hold')).toBeLessThan(html.indexOf('</head>'));
      expect(html).not.toMatch(/href="\/(en|th)\/(usd|thb)/);
      expect(html).toMatch(/<link rel="preload" as="image"[^>]*essential-tee/);
      expect(html).toContain(`<link rel="canonical" href="http://localhost:3000/${locale}/shop"`);
    });

    test('prioritizes the visible LCP image over its hidden hover view (FR-022)', async ({
      page,
      context,
    }) => {
      const session = await context.newCDPSession(page);
      const priorities = new Map<string, string>();
      await session.send('Network.enable');
      session.on('Network.requestWillBeSent', ({ request, type }) => {
        if (type === 'Image' && request.url.includes('essential-tee')) {
          if (request.url.includes('sand-1.webp')) priorities.set('front', request.initialPriority);
          if (request.url.includes('sand-2.webp')) priorities.set('back', request.initialPriority);
        }
      });
      await page.goto(`/${locale}/shop`);
      await expect.poll(() => priorities.get('front')).toBe('High');
      await expect.poll(() => priorities.get('back')).toBe('Low');
      await session.detach();
    });

    test('filters by colour, size and price; the URL carries them, a reload keeps them, and nothing is fetched', async ({
      page,
    }) => {
      const problems = watchConsole(page);
      await page.goto(`/${locale}/shop`);
      await page.waitForLoadState('networkidle');
      const requests: string[] = [];
      page.on('request', (request) => {
        // The reload below is a navigation; everything else (an RSC fetch for the new query) is a bug.
        if (request.isNavigationRequest()) return;
        if (/_rsc=|\/shop\?|\/_next\/data/.test(request.url())) requests.push(request.url());
      });

      const filters = await openFilters(page, locale);
      await filters.getByRole('checkbox', { name: copy.black }).check();
      await expect(page).toHaveURL(/[?&]color=black(&|$)/);
      await chip(filters, 'M').click();
      await expect(page).toHaveURL(/color=black&size=M(&|$)/);
      await filters.getByLabel(copy.min, { exact: true }).fill(String(currency.min));
      await expect(page).toHaveURL(
        new RegExp(`color=black&size=M&minPrice=${currency.min}&priceCurrency=${currency.tag}$`),
      );
      await closeFilters(page, locale);

      await expect(count(page)).toHaveText(copy.count(6));
      expect((await names(page)).length).toBe(6);
      expect(await names(page)).not.toContain(copy.firstFeatured);
      const chips = page.getByRole('list', { name: copy.activeFilters }).getByRole('button');
      await expect(chips).toHaveCount(3);

      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(count(page)).toHaveText(copy.count(6));
      await expect(chips).toHaveCount(3);
      expect(requests).toEqual([]);
      expect(problems).toEqual([]);
    });

    test('Back returns to the filtered list after visiting a product, and filters add no history entries', async ({
      page,
    }) => {
      await page.goto(`/${locale}/shop?color=black&size=M`);
      await page.waitForLoadState('networkidle');
      await expect(count(page)).toHaveText(copy.count(9));
      const before = await page.evaluate(() => window.history.length);

      const filters = await openFilters(page, locale);
      await chip(filters, 'L').click();
      await expect(page).toHaveURL(/size=L,M|size=M,L/);
      await closeFilters(page, locale);
      expect(await page.evaluate(() => window.history.length)).toBe(before);

      await grid(page).first().getByRole('link').click();
      await expect(page).toHaveURL(/\/products\//);
      await page.goBack();

      await expect(page).toHaveURL(/color=black/);
      await expect(count(page)).not.toHaveText(copy.count(12));
      await expect(chips(page)).not.toHaveCount(0);
    });

    test('sorts by price and by newest, and writes the sort to the URL', async ({ page }) => {
      await page.goto(`/${locale}/shop`);
      await page.waitForLoadState('networkidle');
      const select = page.getByLabel(copy.sort);

      await select.selectOption('price-asc');
      expect((await names(page))[0]).toBe(copy.cheapest);
      await expect(page).toHaveURL(/sort=price-asc$/);
      await select.selectOption('price-desc');
      expect((await names(page))[0]).toBe(copy.dearest);
      await select.selectOption('newest');
      expect((await names(page))[0]).toBe(copy.newest);
      await page.reload();
      await expect(page.getByLabel(copy.sort)).toHaveValue('newest');
      expect((await names(page))[0]).toBe(copy.newest);
      await page.getByLabel(copy.sort).selectOption('featured');
      await expect(page).toHaveURL(new RegExp(`/${locale}/shop$`));
    });

    test('removes filters one by one with their chips, and with Clear all, keeping focus on the page', async ({
      page,
    }) => {
      await page.goto(`/${locale}/shop?color=black,sand&size=M&sort=price-asc`);
      await page.waitForLoadState('networkidle');
      const list = page.getByRole('list', { name: copy.activeFilters });
      await expect(list.getByRole('button')).toHaveCount(3);

      await list
        .getByRole('button', { name: new RegExp(`^${copy.remove('')}`) })
        .first()
        .click();
      await expect(list.getByRole('button')).toHaveCount(2);
      await expect(list.getByRole('button').first()).toBeFocused();

      await page.getByRole('button', { name: copy.clearAll }).click();
      await expect(page).toHaveURL(/\/shop\?sort=price-asc$/);
      await expect(count(page)).toHaveText(copy.count(12));
      await expect(count(page)).toBeFocused();
    });

    test('shows the empty state with a primary Clear filters action, and recovers', async ({
      page,
    }) => {
      await page.goto(`/${locale}/shop?category=accessories&size=XXL`);
      await page.waitForLoadState('networkidle');

      await expect(count(page)).toHaveText(copy.count(0));
      await expect(page.getByRole('heading', { level: 2, name: copy.emptyTitle })).toBeVisible();
      await expect(grid(page)).toHaveCount(0);
      // Chips exist even though nothing matches, so every filter can be taken off.
      await expect(
        page.getByRole('list', { name: copy.activeFilters }).getByRole('button'),
      ).toHaveCount(2);

      await page.getByRole('button', { name: copy.clearFilters }).click();

      await expect(page).toHaveURL(new RegExp(`/${locale}/shop$`));
      await expect(grid(page)).toHaveCount(12);
      await expect(count(page)).toBeFocused();
    });

    test('keeps the query when the language is switched', async ({ page }) => {
      await page.goto(`/${locale}/shop?color=black&size=M`);
      await page.waitForLoadState('networkidle');
      const other = locale === 'en' ? 'th' : 'en';

      await page.getByRole('button', { name: locale === 'en' ? 'Open menu' : 'เปิดเมนู' }).click();
      await page.getByRole('link', { name: locale === 'en' ? 'ไทย' : 'English' }).click();

      await expect(page).toHaveURL(new RegExp(`/${other}/shop\\?color=black&size=M$`));
      await expect(count(page)).toHaveText(COPY[other].count(9));
    });
  });

  test.describe(`/${locale}/collections`, () => {
    test('a category page lists only its products, names the category, and has no category filter', async ({
      page,
    }) => {
      const problems = watchConsole(page);
      await page.goto(`/${locale}/collections/foundations`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('heading', { level: 1 })).toHaveText(copy.foundations);
      await expect(count(page)).toHaveText(copy.count(3));
      await expect(grid(page)).toHaveCount(3);
      const crumbs = page.getByRole('navigation', { name: copy.breadcrumb });
      await expect(crumbs.getByRole('listitem')).toHaveText([
        copy.home,
        copy.shop,
        copy.foundations,
      ]);
      await expect(crumbs.getByRole('link', { name: copy.shop })).toHaveAttribute(
        'href',
        `/${locale}/shop`,
      );
      await expect(page.getByRole('group', { name: /^(Category|หมวดหมู่)$/ })).toHaveCount(0);
      expect(problems).toEqual([]);
    });

    test('filters inside the category, and ignores ?category= from the URL', async ({ page }) => {
      await page.goto(`/${locale}/collections/lifestyle?category=accessories`);
      await page.waitForLoadState('networkidle');
      await expect(count(page)).toHaveText(copy.count(3));

      const filters = await openFilters(page, locale);
      await filters.getByRole('checkbox', { name: copy.black }).check();
      await expect(page).toHaveURL(new RegExp(`/${locale}/collections/lifestyle\\?color=black$`));
      await closeFilters(page, locale);
      await expect(count(page)).toHaveText(copy.count(3));
    });

    test('answers 404 for an unknown category and never renders it on demand', async ({
      request,
    }) => {
      for (const slug of ['nope', 'Foundations', 'foundations%20']) {
        const response = await request.get(`/${locale}/collections/${slug}`);
        expect(response.status()).toBe(404);
        expect(response.headers()['cache-control']).toMatch(/no-store|no-cache/);
        expect(await response.text()).toContain(COPY.en.notFound);
      }
    });
  });
}

test.describe('navigation to the same collection page (review r1, ADR-0006)', () => {
  for (const locale of LOCALES) {
    const copy = COPY[locale];
    const menu = locale === 'en' ? 'Open menu' : 'เปิดเมนู';
    const shopAll = locale === 'en' ? 'Shop all' : 'ดูสินค้าทั้งหมด';

    test(`/${locale}: menu "${shopAll}" from a filtered /shop shows the full list and no chips`, async ({
      page,
    }) => {
      const problems = watchConsole(page);
      await page.goto(`/${locale}/shop?color=grey&size=S`);
      await page.waitForLoadState('networkidle');
      await expect(count(page)).not.toHaveText(copy.count(12));
      await expect(chips(page)).toHaveCount(2);

      await page.getByRole('button', { name: menu }).click();
      await page.getByRole('dialog').getByRole('link', { name: shopAll }).click();

      await expect(page).toHaveURL(new RegExp(`/${locale}/shop$`));
      await expect(count(page)).toHaveText(copy.count(12));
      await expect(grid(page)).toHaveCount(12);
      await expect(chips(page)).toHaveCount(0);
      // The state is really the URL's again: a filter chosen now starts from a clean slate.
      const filters = await openFilters(page, locale);
      await expect(filters.getByRole('checkbox', { name: /^(Grey|เทา)$/ })).not.toBeChecked();
      expect(problems).toEqual([]);
    });

    test(`/${locale}: a category link from that category's own filtered page clears its filters`, async ({
      page,
    }) => {
      const problems = watchConsole(page);
      await page.goto(`/${locale}/collections/foundations?color=grey`);
      await page.waitForLoadState('networkidle');
      await expect(chips(page)).toHaveCount(1);
      const filtered = await count(page).textContent();

      await page.getByRole('button', { name: menu }).click();
      await page
        .getByRole('dialog')
        .getByRole('navigation')
        .getByRole('link', { name: copy.foundations })
        .click();

      await expect(page).toHaveURL(new RegExp(`/${locale}/collections/foundations$`));
      await expect(count(page)).toHaveText(copy.count(3));
      expect(filtered).not.toBe(copy.count(3));
      await expect(grid(page)).toHaveCount(3);
      await expect(chips(page)).toHaveCount(0);
      expect(problems).toEqual([]);
    });
  }

  test('a link from the menu to a different filtered state of the page still works after filtering', async ({
    page,
  }) => {
    await page.goto('/en/shop?color=grey');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('dialog').getByRole('link', { name: 'Shop all' }).click();
    await expect(count(page)).toHaveText('12 products');

    const filters = await openFilters(page, 'en');
    await filters.getByRole('checkbox', { name: 'Black' }).check();
    await expect(page).toHaveURL(/\/en\/shop\?color=black$/);
    await closeFilters(page, 'en');

    await expect(chips(page)).toHaveCount(1);
  });
});

test.describe('shared links and currency (ADR-0003)', () => {
  test('a link with USD bounds shows converted baht bounds to a visitor who uses baht', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: 'en-US',
    });
    await context.addCookies([{ name: 'hc_currency', value: 'THB', url: baseURL ?? '' }]);
    const page = await context.newPage();
    await page.goto('/en/shop?minPrice=50&maxPrice=90&priceCurrency=usd');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('textbox', { name: 'Min', exact: true })).toHaveValue('1750');
    await expect(page.getByRole('textbox', { name: 'Max', exact: true })).toHaveValue('3150');
    await expect(page.getByRole('group', { name: 'Price (฿)' })).toBeVisible();
    await expect(page.getByTestId('result-count')).toHaveText('5 products');
    await expect(page.getByTestId('product-price').first()).toHaveText(/^฿/);
    await expect(page.getByRole('list', { name: 'Active filters' }).getByRole('button')).toHaveText(
      /฿1,750 to ฿3,150/,
    );
    await context.close();
  });

  test('switching currency in the menu re-reads the bounds in the new currency', async ({
    page,
  }) => {
    await page.goto('/en/shop?minPrice=50&maxPrice=90&priceCurrency=usd');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('result-count')).toHaveText('5 products');
    const before = await names(page);

    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByText('Thai baht (THB)').click();
    await expect(page.getByTestId('product-price').first()).toHaveText(/^฿/);
    await page.keyboard.press('Escape');

    if (isNarrow(page)) {
      await page.getByRole('button', { name: /^Filters/ }).click();
    }
    await expect(page.getByRole('textbox', { name: 'Min', exact: true })).toHaveValue('1750');
    await expect(page.getByTestId('result-count')).toHaveText('5 products');
    expect(await names(page)).toEqual(before);
  });

  test('an unknown ?priceCurrency= and a stray parameter are ignored', async ({ page }) => {
    await page.goto('/en/shop?minPrice=50&priceCurrency=eur&utm_source=x');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('result-count')).toHaveText('6 products');
  });
});

test.describe('mobile filters drawer (RULES 8.6)', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) >= 1024, 'the drawer exists below lg only');

  for (const locale of LOCALES) {
    test(`/${locale}: opens from the keyboard, traps focus, closes on Esc and returns focus`, async ({
      page,
    }) => {
      const copy = COPY[locale];
      const problems = watchConsole(page);
      await page.goto(`/${locale}/shop`);
      await page.waitForLoadState('networkidle');
      // Located without its role: while the dialog is open the rest of the page is hidden from the
      // accessibility tree, and the test must still find the button to check focus returns to it.
      const trigger = page
        .locator('button[aria-haspopup="dialog"]')
        .filter({ hasText: copy.filtersButton });
      await expect(trigger).toBeVisible();
      const box = await trigger.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);

      await trigger.focus();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog', { name: copy.filtersTitle });
      await expect(dialog).toBeVisible();
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');

      // Tab through the whole dialog and a few more times: focus never leaves it.
      for (let step = 0; step < 40; step += 1) {
        await page.keyboard.press('Tab');
        expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
      }
      // Reverse direction wraps too.
      await page.keyboard.press('Shift+Tab');
      expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);

      // A keyboard user picks a colour with Space: the live count in the footer button follows.
      await dialog.getByRole('checkbox', { name: copy.black }).focus();
      await page.keyboard.press('Space');
      await expect(page).toHaveURL(/color=black$/);
      await expect(page.getByRole('button', { name: copy.showResults })).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await expect(trigger).toContainText('(1)');
      expect(problems).toEqual([]);
    });

    test(`/${locale}: the sort and filter bar stays under the header while scrolling`, async ({
      page,
    }) => {
      await page.goto(`/${locale}/shop`);
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => window.scrollTo(0, 900));
      const trigger = page.getByRole('button', { name: COPY[locale].filtersButton });

      const box = await trigger.boundingBox();
      expect(box?.y).toBeGreaterThanOrEqual(60);
      expect(box?.y).toBeLessThan(120);
      await expect(page.getByLabel(COPY[locale].sort)).toBeInViewport();
    });
  }
});

test.describe('desktop sidebar', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1024, 'the sidebar exists from lg up');

  test('shows the filter groups beside the grid and no Filters button', async ({ page }) => {
    await page.goto('/en/shop');
    const sidebar = page.getByRole('complementary', { name: 'Filters' });

    await expect(sidebar).toBeVisible();
    for (const group of ['Category', 'Colour', 'Size', 'Price ($)']) {
      await expect(sidebar.getByRole('group', { name: group })).toBeVisible();
    }
    await expect(page.getByRole('button', { name: /^Filters/ })).toBeHidden();
    // Every colour option is a swatch plus its visible name; every control is at least 44px tall.
    const rows = sidebar.locator('label');
    for (const index of [0, 6, 12]) {
      const box = await rows.nth(index).boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('layout stability on a filtered link (ADR-0006)', () => {
  test('does not shift when the page takes over from the static HTML, even with slow scripts', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as unknown as { value: number; hadRecentInput: boolean };
          if (!shift.hadRecentInput) (window as unknown as { __cls: number }).__cls += shift.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    // The page paints from the static HTML well before React is ready.
    await page.route('**/_next/static/**/*.js', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await route.continue();
    });
    await page.goto('/en/shop?color=black&size=M&minPrice=50&priceCurrency=usd');
    await expect(page.getByTestId('result-count')).toHaveText('6 products', { timeout: 15_000 });
    await page.waitForTimeout(500);

    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    expect(cls).toBeLessThan(0.02);
    // The hold is gone once the page is interactive: the grid is visible.
    await expect(page.locator('#catalogue-hold')).toHaveCount(0);
    await expect(grid(page).first()).toBeVisible();
  });
});

test.describe('the pre-paint hold only applies to catalogue filters (review r1)', () => {
  // Scripts are slow, so the page is painted from the static HTML long before React is ready.
  test.beforeEach(async ({ page }) => {
    await page.route('**/_next/static/**/*.js', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });
  });

  for (const query of ['?utm_source=newsletter', '?fbclid=IwAR0x&gclid=Cj0', '?sort=featured']) {
    test(`${query}: grid, count and filters are visible at first paint, with no hold`, async ({
      page,
    }) => {
      await page.goto(`/en/shop${query}`, { waitUntil: 'domcontentloaded' });

      await expect(grid(page).first()).toBeVisible({ timeout: 1000 });
      await expect(count(page)).toBeVisible({ timeout: 1000 });
      await expect(page.locator('#catalogue-hold')).toHaveCount(0);
      await expect(count(page)).toHaveText('12 products');
    });
  }

  test('a filter parameter holds the grid, the count and the filters button until hydration', async ({
    page,
  }) => {
    await page.goto('/en/shop?color=black&size=M', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#catalogue-hold')).toHaveCount(1);
    await expect(count(page)).toBeHidden();
    await expect(grid(page).first()).toBeHidden();
    // Once React has taken over the held parts show the filtered result.
    await expect(count(page)).toHaveText(COPY.en.count(9), { timeout: 15_000 });
    await expect(grid(page).first()).toBeVisible();
    await expect(page.locator('#catalogue-hold')).toHaveCount(0);
  });
});

test.describe('collection without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('shows the full list, prices and links to every product and category', async ({ page }) => {
    await page.goto('/en/shop');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Shop all');
    await expect(page.getByTestId('product-price')).toHaveCount(12);
    await expect(grid(page)).toHaveCount(12);
    await expect(page.getByRole('link', { name: 'Home' }).first()).toBeVisible();
  });
});

function chips(page: Page): Locator {
  return page
    .getByRole('list', { name: /^(Active filters|ตัวกรองที่ใช้อยู่)$/ })
    .getByRole('button');
}
