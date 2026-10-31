import { expect, test, type Locator, type Page } from '@playwright/test';

import { LOCALES, allRoutes, type Locale } from './routes';

// SPEC 14 critical journeys, each run in both locales on the mobile and desktop projects.
//   Journey 1  this file: browse, filter, product, variant, cart, quantity, checkout, confirmation
//   Journey 2  look.spec.ts       "Journey 2: complete look survives reload and loses its discount ..."
//   Journey 3  this file: locale and currency switch, persistence across reload and navigation
//   Journey 4  look.spec.ts       "Journey 4: unavailable look adds nothing and offers an alternative ..."
//   Journey 5  product-cart.spec.ts "Journey 5: corrupt and stale localStorage recover ..."
// `pnpm test:e2e --grep Journey` runs all five.

const COPY = {
  en: {
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    shopAll: 'Shop all',
    filtersTitle: 'Filters',
    filtersButton: /^Filters/,
    showResults: /^Show \d+ results?$/,
    black: 'Black',
    activeFilters: 'Active filters',
    size: 'Size',
    qty: 'Quantity',
    add: 'Add to cart',
    submit: 'Place demo order',
    demoNotice: /no payment taken/i,
    thaiBaht: /Thai baht/,
    usDollar: /US dollar/,
  },
  th: {
    openMenu: 'เปิดเมนู',
    closeMenu: 'ปิดเมนู',
    shopAll: 'ดูสินค้าทั้งหมด',
    filtersTitle: 'ตัวกรอง',
    filtersButton: /^ตัวกรอง/,
    showResults: /^ดู \d+ รายการ$/,
    black: 'ดำ',
    activeFilters: 'ตัวกรองที่ใช้อยู่',
    size: 'ขนาด',
    qty: 'จำนวน',
    add: 'เพิ่มลงตะกร้า',
    submit: 'สั่งซื้อแบบเดโม',
    demoNotice: /ไม่มีการเรียกเก็บเงิน/,
    thaiBaht: /บาทไทย/,
    usDollar: /ดอลลาร์สหรัฐ/,
  },
} as const;

const isNarrow = (page: Page): boolean => (page.viewportSize()?.width ?? 0) < 1024;

function watchProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      problems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  return problems;
}

async function openMenu(page: Page, locale: Locale): Promise<Locator> {
  await page.getByRole('button', { name: COPY[locale].openMenu }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Menu link to the full catalogue: the same way a visitor gets from the home page to the shop. */
async function goToShopViaMenu(page: Page, locale: Locale): Promise<void> {
  const dialog = await openMenu(page, locale);
  await dialog.getByRole('link', { name: COPY[locale].shopAll, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/shop$`));
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

for (const locale of LOCALES) {
  const copy = COPY[locale];
  const th = locale === 'th';

  test(`Journey 1: browse, filter, choose a variant, add, change quantity, check out and see the demo confirmation ${locale} (FR-021, FR-031, FR-033, FR-050, FR-053, FR-054, FR-055)`, async ({
    page,
  }) => {
    const problems = watchProblems(page);

    // Browse: home -> shop.
    await page.goto(`/${locale}`);
    await goToShopViaMenu(page, locale);
    await page.waitForLoadState('networkidle');

    // Filter by colour (sidebar from lg, drawer below).
    let filters: Locator;
    if (isNarrow(page)) {
      await page.getByRole('button', { name: copy.filtersButton }).click();
      filters = page.getByRole('dialog', { name: copy.filtersTitle });
      await expect(filters).toBeVisible();
    } else {
      filters = page.getByRole('complementary', { name: copy.filtersTitle });
    }
    await filters.getByRole('checkbox', { name: copy.black }).check();
    await expect(page).toHaveURL(/[?&]color=black(&|$)/);
    if (isNarrow(page)) {
      await page.getByRole('button', { name: copy.showResults }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
    await expect(
      page.getByRole('list', { name: copy.activeFilters }).getByRole('button'),
    ).toHaveCount(1);

    // Product: open the essential tee from the filtered list and pick a size.
    await page.locator(`a[href="/${locale}/products/essential-tee"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/products/essential-tee$`));
    const add = page.getByRole('button', { name: copy.add, exact: true });
    await expect(add).toHaveAttribute('aria-disabled', 'true');
    await page
      .getByRole('group', { name: copy.size, exact: true })
      .getByRole('radio', { name: 'M', exact: true })
      .check();
    await expect(add).not.toHaveAttribute('aria-disabled', 'true');
    await add.click();

    // Cart drawer: the line is there; change the quantity.
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('combobox')).toHaveValue('1');
    await drawer.getByRole('combobox').selectOption('2');
    await expect(drawer.getByRole('combobox')).toHaveValue('2');

    // Cart page, then checkout.
    await drawer.getByRole('link', { name: th ? 'ดูตะกร้า' : 'View cart', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/cart$`));
    await expect(page.getByRole('main').getByRole('combobox')).toHaveValue('2');
    await page.getByRole('main').locator(`a[href="/${locale}/checkout"]`).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/checkout$`));
    await expect(page.getByRole('main')).toContainText(copy.demoNotice);

    const values = {
      name: 'Demo Customer',
      email: 'demo@example.com',
      address: '123 Example Road',
      city: 'Example City',
      postalCode: '10000',
      country: 'Thailand',
    };
    for (const [field, value] of Object.entries(values)) {
      await page.locator(`#checkout-${field}`).fill(value);
    }
    await page.locator('#checkout-shipping').selectOption('standard');
    await page.getByRole('button', { name: copy.submit }).click();

    // Confirmation: reference, demo notice, cart cleared.
    await expect(page).toHaveURL(/checkout\/success\?order=HC-DEMO-/);
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(main).toContainText('HC-DEMO-');
    await expect(main).toContainText(copy.demoNotice);
    expect(await page.evaluate(() => localStorage.getItem('hc:cart:v1'))).toBeNull();
    expect(problems).toEqual([]);
  });

  test(`Journey 3: locale and currency choices persist across reload and navigation, starting from /${locale} (FR-002, FR-071, FR-072)`, async ({
    page,
    context,
  }) => {
    const problems = watchProblems(page);
    const other: Locale = th ? 'en' : 'th';
    const target = COPY[other];
    // Pick the currency that is NOT the other locale's default, so the choice is visible in the price.
    const currency = th ? 'THB' : 'USD';
    const expectedPrice = th ? '฿1,715' : 'US$49.00';

    await page.goto(`/${locale}`);
    const menu = await openMenu(page, locale);
    await menu.locator(`ul a[lang="${other}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/${other}$`));
    await expect(page.locator('html')).toHaveAttribute('lang', other);

    await page.getByRole('button', { name: target.openMenu }).click();
    await page.getByText(th ? target.thaiBaht : target.usDollar).click();
    await page.getByRole('button', { name: target.closeMenu }).click();
    const price = page.getByTestId('product-price').first();
    await expect(price).toHaveText(expectedPrice);
    expect(new URL(page.url()).pathname).toBe(`/${other}`);

    // Reload: locale and currency come back from the URL and the cookie.
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', other);
    await expect(price).toHaveText(expectedPrice);
    const cookies = await context.cookies();
    expect(cookies.find((cookie) => cookie.name === 'hc_currency')?.value).toBe(currency);

    // Navigate to another page: still the chosen language and currency, and a public URL.
    await goToShopViaMenu(page, other);
    await expect(page.locator('html')).toHaveAttribute('lang', other);
    await expect(page.getByTestId('product-price').first()).toHaveText(expectedPrice);
    expect(new URL(page.url()).pathname).toBe(`/${other}/shop`);
    expect(problems).toEqual([]);
  });
}

test.describe('route manifest (SPEC 14, RULES 8.8)', () => {
  test('covers every sitemap URL, so the axe sweep misses no indexable page', async ({
    request,
  }) => {
    const xml = await (await request.get('/sitemap.xml')).text();
    const sitemapPaths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (match) => new URL(match[1] ?? '').pathname,
    );
    expect(sitemapPaths.length).toBeGreaterThan(0);
    const manifest = new Set(allRoutes());
    expect(sitemapPaths.filter((path) => !manifest.has(path))).toEqual([]);
  });
});
