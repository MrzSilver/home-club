import { expect, test, type Locator, type Page } from '@playwright/test';

// T06: header, menu drawer, locale and currency switchers, footer and newsletter (FR-001 to FR-004).
// The first Essentials card on the home page is the essential tee: $49.00 = THB 1,715.
const LOCALES = ['en', 'th'] as const;
type Locale = (typeof LOCALES)[number];

const COPY = {
  en: {
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    menuTitle: 'Menu',
    thb: /Thai baht/,
    usd: /US dollar/,
    otherLocale: 'ไทย',
    emailLabel: 'Email address',
    submit: /Join the Club/,
    required: 'Enter your email address.',
    invalid: 'Enter a valid email address, like name@example.com.',
    success: 'Thanks — this is a demo, nothing was sent.',
    announceTHB: 'Prices are now shown in Thai baht (THB).',
    skip: 'Skip to content',
    search: 'Search',
    searchReason: 'Search is coming soon.',
    cart: 'Cart',
    homeLink: 'Home Club Foundation, home page',
  },
  th: {
    openMenu: 'เปิดเมนู',
    closeMenu: 'ปิดเมนู',
    menuTitle: 'เมนู',
    thb: /บาทไทย/,
    usd: /ดอลลาร์สหรัฐ/,
    otherLocale: 'English',
    emailLabel: 'อีเมล',
    submit: /ร่วมเป็นสมาชิก$/,
    required: 'กรุณากรอกอีเมล',
    invalid: 'รูปแบบอีเมลไม่ถูกต้อง ตัวอย่างเช่น name@example.com',
    success: 'ขอบคุณที่สนใจ นี่เป็นเว็บตัวอย่าง จึงไม่มีการส่งข้อมูลใด ๆ',
    announceTHB: 'ตอนนี้แสดงราคาเป็นบาทไทย (THB)',
    skip: 'ข้ามไปยังเนื้อหาหลัก',
    search: 'ค้นหา',
    searchReason: 'ระบบค้นหาจะเปิดให้ใช้เร็ว ๆ นี้',
    cart: 'ตะกร้าสินค้า',
    homeLink: 'Home Club Foundation หน้าแรก',
  },
} as const satisfies Record<Locale, Record<string, string | RegExp>>;

const FOCUS_RING = 'rgb(31, 79, 216)'; // --color-focus, on the canvas
const FOCUS_RING_ON_DARK = 'rgb(157, 184, 255)'; // --color-focus-on-dark

/** Radios are visually hidden inside their label, so a visitor clicks the label. */
async function chooseCurrency(drawer: Locator, name: RegExp): Promise<void> {
  await drawer.locator('label', { hasText: name }).click();
}

const price = (page: Page): Locator => page.getByTestId('product-price').first();
const menuButton = (page: Page, locale: Locale): Locator =>
  page.getByRole('button', { name: COPY[locale].openMenu });
const dialog = (page: Page, locale: Locale): Locator =>
  page.getByRole('dialog', { name: COPY[locale].menuTitle });

async function openMenu(page: Page, locale: Locale): Promise<Locator> {
  await menuButton(page, locale).click();
  const drawer = dialog(page, locale);
  await expect(drawer).toBeVisible();
  return drawer;
}

/**
 * Waits until React has hydrated the footer's newsletter wrapper (it attaches `__reactProps$...` to
 * hydrated nodes). `networkidle` does not mean hydrated, and a submit before hydration is a plain
 * browser form submit by design.
 */
async function waitForFooterHydration(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const wrapper = document.querySelector('footer form')?.parentElement;
    return (
      wrapper !== null &&
      wrapper !== undefined &&
      Object.keys(wrapper).some((key) => key.startsWith('__reactProps'))
    );
  });
}

/** Collects console errors and warnings, page errors and CSP violations (hydration problems included). */
async function watchProblems(page: Page): Promise<string[]> {
  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') problems.push(message.text());
  });
  page.on('pageerror', (error) => problems.push(error.message));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      console.error(`CSP violation: ${event.violatedDirective} ${event.blockedURI}`);
    });
  });
  return problems;
}

for (const locale of LOCALES) {
  const copy = COPY[locale];

  test.describe(`shell in /${locale}`, () => {
    test('has one banner, main and contentinfo, a labelled footer nav and exactly one h1 (FR-004)', async ({
      page,
    }) => {
      await page.goto(`/${locale}`);

      await expect(page.getByRole('banner')).toHaveCount(1);
      await expect(page.getByRole('main')).toHaveCount(1);
      await expect(page.getByRole('contentinfo')).toHaveCount(1);
      await expect(page.getByRole('navigation')).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.locator('main#main')).toHaveCount(1);
    });

    test('the skip link is the first tab stop and jumps to main (FR-004)', async ({ page }) => {
      await page.goto(`/${locale}`);

      await page.keyboard.press('Tab');
      const skip = page.getByRole('link', { name: copy.skip });
      await expect(skip).toBeFocused();
      await expect(skip).toBeInViewport();
      await page.keyboard.press('Enter');

      await expect(page).toHaveURL(new RegExp(`/${locale}#main$`));
      await expect(page.locator('main#main')).toBeInViewport();
    });

    test('the wordmark links home in this locale, and the header is 64px (mobile) or 80px (desktop) high', async ({
      page,
    }) => {
      await page.goto(`/${locale}`);

      const home = page.getByRole('link', { name: copy.homeLink });
      await expect(home).toHaveAttribute('href', `/${locale}`);
      await expect(home.locator('[lang="en"]')).toContainText('Home Club');
      const box = await page.getByRole('banner').boundingBox();
      const width = page.viewportSize()?.width ?? 0;
      expect(box?.height).toBe(width < 768 ? 64 : 80);
    });

    test('search and cart are focusable but inert, and say why (FR-001)', async ({ page }) => {
      await page.goto(`/${locale}`);

      const search = page.getByRole('button', { name: copy.search });
      await expect(search).toHaveAttribute('aria-disabled', 'true');
      await expect(search).toHaveAccessibleDescription(copy.searchReason);
      await search.focus();
      await expect(search).toBeFocused();
      const cart = page.getByRole('button', { name: copy.cart });
      await expect(cart).toHaveAttribute('aria-disabled', 'true');
      for (const control of [search, cart, menuButton(page, locale)]) {
        const box = await control.boundingBox();
        expect(box?.width).toBeGreaterThanOrEqual(44);
        expect(box?.height).toBeGreaterThanOrEqual(44);
      }
    });

    test('the header is transparent over the hero and solid once it has scrolled away; the focus ring follows', async ({
      page,
    }) => {
      await page.goto(`/${locale}`);
      const header = page.getByRole('banner');
      await expect(header).not.toHaveAttribute('data-past-hero');
      await expect(header).toHaveCSS('color', 'rgb(247, 244, 239)');

      // Keyboard focus on the hamburger: skip link first, then the menu button.
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await expect(menuButton(page, locale)).toBeFocused();
      await expect(menuButton(page, locale)).toHaveCSS('outline-color', FOCUS_RING_ON_DARK);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect(header).toHaveAttribute('data-past-hero', '');
      await expect(header).toHaveCSS('color', 'rgb(20, 20, 18)');
      await expect(menuButton(page, locale)).toHaveCSS('outline-color', FOCUS_RING);

      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(header).not.toHaveAttribute('data-past-hero');
      await expect(header).toHaveCSS('color', 'rgb(247, 244, 239)');
    });

    test('the header turns solid when scrolling gradually with the wheel in 40px steps, and back again (never light-on-light)', async ({
      page,
    }) => {
      await page.goto(`/${locale}`);
      await page.waitForLoadState('networkidle');
      const header = page.getByRole('banner');
      const width = page.viewportSize()?.width ?? 0;
      const headerHeight = width < 768 ? 64 : 80;
      await page.mouse.move(width / 2, 300);

      const sample = async (): Promise<{ top: number; past: boolean }> =>
        page.evaluate(() => ({
          top: document.querySelector('[data-header-sentinel]')?.getBoundingClientRect().top ?? NaN,
          past: document.querySelector('header')?.hasAttribute('data-past-hero') ?? false,
        }));
      const check = (samples: Array<{ top: number; past: boolean }>): void => {
        for (const { top, past } of samples) {
          // Well clear of the header edge the state must be unambiguous.
          if (top > headerHeight + 8) expect(past, `sentinel at ${top}px`).toBe(false);
          if (top < headerHeight - 8) expect(past, `sentinel at ${top}px`).toBe(true);
        }
      };

      const down: Array<{ top: number; past: boolean }> = [];
      for (let step = 0; step < 40; step += 1) {
        await page.mouse.wheel(0, 40);
        await page.waitForTimeout(90);
        down.push(await sample());
      }
      check(down);
      expect(down.at(-1)?.top).toBeLessThan(headerHeight - 8); // really scrolled past the hero
      expect(down.some((entry) => entry.past)).toBe(true);
      await expect(header).toHaveCSS('color', 'rgb(20, 20, 18)');

      const up: Array<{ top: number; past: boolean }> = [];
      for (let step = 0; step < 40; step += 1) {
        await page.mouse.wheel(0, -40);
        await page.waitForTimeout(90);
        up.push(await sample());
      }
      check(up);
      await expect(header).toHaveCSS('color', 'rgb(247, 244, 239)');
    });

    test('does not shift the layout when the header changes state or the menu loads (CLS)', async ({
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
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.evaluate(() => window.scrollTo(0, 0));
      await openMenu(page, locale);
      await page.keyboard.press('Escape');

      const shift = await page.evaluate(() => (window as unknown as { __shift: number }).__shift);
      // ADR-0001 (T07 r2): /th on desktop may shift by about 0.018 when Noto Sans Thai swaps in under
      // the display headline (no headline preload); the budget is 0.1. Everything else stays under 0.01.
      const limit = locale === 'th' && testInfo.project.name === 'desktop' ? 0.02 : 0.01;
      expect(shift).toBeLessThan(limit);
    });

    test('menu: opens from the keyboard, traps focus, hides the page, locks scroll, closes on Escape and returns focus (RULES 8.6)', async ({
      page,
    }) => {
      await page.goto(`/${locale}`);

      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      const drawer = dialog(page, locale);
      await expect(drawer).toBeVisible();
      await expect(drawer).toHaveAttribute('aria-modal', 'true');
      await expect(menuButton(page, locale)).toHaveCount(0); // aria-hidden while the dialog is open
      await expect(page.getByRole('main')).toHaveCount(0);
      await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');

      // Focus starts inside and never leaves, forwards or backwards.
      const insideDialog = (): Promise<boolean> =>
        page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null);
      expect(await insideDialog()).toBe(true);
      for (let step = 0; step < 14; step += 1) {
        await page.keyboard.press('Tab');
        expect(await insideDialog()).toBe(true);
      }
      for (let step = 0; step < 14; step += 1) {
        await page.keyboard.press('Shift+Tab');
        expect(await insideDialog()).toBe(true);
      }

      await page.keyboard.press('Escape');
      await expect(drawer).toHaveCount(0);
      await expect(menuButton(page, locale)).toBeFocused();
      await expect(page.getByRole('main')).toHaveCount(1);
      await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
    });

    test('menu: the close button closes it and focus returns to the hamburger', async ({
      page,
    }) => {
      await page.goto(`/${locale}`);
      const drawer = await openMenu(page, locale);

      await drawer.getByRole('button', { name: copy.closeMenu }).click();

      await expect(drawer).toHaveCount(0);
      await expect(menuButton(page, locale)).toBeFocused();
    });

    test('menu: lists Home, Shop all and the four categories with public, locale-prefixed links', async ({
      page,
    }) => {
      await page.goto(`/${locale}`);
      const drawer = await openMenu(page, locale);

      const hrefs = await drawer
        .getByRole('navigation')
        .getByRole('link')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
      expect(hrefs).toEqual([
        `/${locale}`,
        `/${locale}/shop`,
        `/${locale}/collections/foundations`,
        `/${locale}/collections/performance`,
        `/${locale}/collections/lifestyle`,
        `/${locale}/collections/accessories`,
      ]);
    });

    test('footer: real links into the shop, plain-text legal placeholders, demo notice, copyright', async ({
      page,
    }) => {
      await page.goto(`/${locale}`);
      const footer = page.getByRole('contentinfo');

      const hrefs = await footer
        .getByRole('link')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
      expect(hrefs).toContain(`/${locale}/shop`);
      expect(hrefs).toContain(`/${locale}/collections/accessories`);
      expect(hrefs.every((href) => href?.startsWith(`/${locale}`))).toBe(true);
      await expect(footer).toContainText('©');
      await expect(footer).toContainText(String(new Date().getFullYear()));
      await expect(
        footer.locator('a', { hasText: /Privacy|Terms|ความเป็นส่วนตัว|เงื่อนไข/ }),
      ).toHaveCount(0);
      await expect(footer.getByRole('contentinfo')).toHaveCount(0);
    });

    test('newsletter: loads on first use, validates (click and Enter), confirms as a demo, sends and stores nothing (FR-003)', async ({
      page,
    }) => {
      const problems = await watchProblems(page);
      await page.goto(`/${locale}`);
      await page.waitForLoadState('networkidle');
      await waitForFooterHydration(page);
      const requests: Array<{ url: string; type: string }> = [];
      page.on('request', (request) =>
        requests.push({ url: request.url(), type: request.resourceType() }),
      );
      const field = page.getByLabel(copy.emailLabel);
      const form = page.getByRole('contentinfo');

      // Plain server HTML until used: no form code has been requested yet.
      expect(requests).toEqual([]);

      // Enter in the empty field: the error is announced and wired to the field.
      await field.click();
      await page.keyboard.press('Enter');
      const alert = form.getByRole('alert');
      await expect(alert).toHaveText(copy.required);
      await expect(field).toBeFocused();
      await expect(field).toHaveAttribute('aria-invalid', 'true');
      await expect(field).toHaveAttribute(
        'aria-describedby',
        (await alert.getAttribute('id')) ?? '',
      );

      // The second invalid submit is announced again (a fresh alert node), via the button.
      await field.fill('not an email');
      await form.getByRole('button', { name: copy.submit }).click();
      await expect(form.getByRole('alert')).toHaveText(copy.invalid);
      await expect(field).toBeFocused();

      await field.fill('peem@example.com');
      await page.keyboard.press('Enter');
      const confirmation = form.getByRole('status');
      await expect(confirmation).toHaveText(copy.success);
      await expect(confirmation).toBeFocused();

      // Only the lazily loaded script chunk was fetched: nothing was sent anywhere.
      expect(
        requests.filter(({ url, type }) => type !== 'script' || !url.includes('/_next/static/')),
      ).toEqual([]);
      const stored = await page.evaluate(() => localStorage.length + sessionStorage.length);
      expect(stored).toBe(0);
      expect(problems).toEqual([]);
    });

    test('newsletter: a click on the submit button of the untouched form is not lost to the swap', async ({
      page,
    }) => {
      await page.goto(`/${locale}`);
      await page.waitForLoadState('networkidle');
      await waitForFooterHydration(page);
      const form = page.getByRole('contentinfo');

      await form.getByRole('button', { name: copy.submit }).click();

      await expect(form.getByRole('alert')).toHaveText(copy.required);
    });

    test('locale switch: lands on the same path in the other language, keeps the query string and is remembered', async ({
      page,
    }) => {
      const other = locale === 'en' ? 'th' : 'en';
      await page.goto(`/${locale}?utm=demo`);

      const drawer = await openMenu(page, locale);
      await drawer.getByRole('link', { name: copy.otherLocale }).click();

      await expect(page).toHaveURL(new RegExp(`/${other}\\?utm=demo$`));
      await expect(page.locator('html')).toHaveAttribute('lang', other);

      // NEXT_LOCALE lasts a year (FR-002 "persist across sessions"), it is not a session cookie.
      const localeCookie = (await page.context().cookies()).find((c) => c.name === 'NEXT_LOCALE');
      expect(localeCookie).toMatchObject({ value: other, path: '/', sameSite: 'Lax' });
      expect((localeCookie?.expires ?? -1) - Date.now() / 1000).toBeGreaterThan(60 * 60 * 24 * 360);

      // NEXT_LOCALE: a later visit to "/" goes to the last language chosen.
      await page.goto('/');
      await expect(page).toHaveURL(new RegExp(`/${other}$`));
    });

    test('locale switch: the current language is marked and the other one is a plain link', async ({
      page,
    }) => {
      await page.goto(`/${locale}`);
      const drawer = await openMenu(page, locale);

      const current = drawer.locator(`a[lang="${locale}"]`);
      const other = drawer.locator(`a[lang="${locale === 'en' ? 'th' : 'en'}"]`);
      await expect(current).toHaveAttribute('aria-current', 'true');
      await expect(other).not.toHaveAttribute('aria-current', 'true');
      await expect(other).toHaveAttribute('href', `/${locale === 'en' ? 'th' : 'en'}`);
    });

    test('currency switch: prices change in place without a reload, focus and the menu stay, and it persists', async ({
      page,
    }) => {
      const problems = await watchProblems(page);
      await page.goto(`/${locale}`);
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => {
        (window as unknown as { __sameDocument: boolean }).__sameDocument = true;
      });
      const startsInBaht = locale === 'th';
      await expect(price(page)).toHaveText(startsInBaht ? '฿1,715' : '$49.00');

      const drawer = await openMenu(page, locale);
      const group = drawer.getByRole('group');
      const target = startsInBaht ? copy.usd : copy.thb;
      await chooseCurrency(drawer, target);

      await expect(price(page)).toHaveText(startsInBaht ? 'US$49.00' : '฿1,715');
      expect(
        await page.evaluate(
          () => (window as unknown as { __sameDocument?: boolean }).__sameDocument,
        ),
      ).toBe(true);
      await expect(group.getByLabel(target)).toBeChecked();
      await expect(group.getByLabel(target)).toBeFocused();
      await expect(drawer).toBeVisible();
      if (!startsInBaht) await expect(group.getByRole('status')).toHaveText(copy.announceTHB);
      const cookie = (await page.context().cookies()).find((c) => c.name === 'hc_currency');
      expect(cookie).toMatchObject({
        value: startsInBaht ? 'USD' : 'THB',
        path: '/',
        sameSite: 'Lax',
      });
      expect((cookie?.expires ?? 0) - Date.now() / 1000).toBeGreaterThan(60 * 60 * 24 * 360);

      // Persists across a reload and a fresh navigation.
      await page.reload();
      await expect(price(page)).toHaveText(startsInBaht ? 'US$49.00' : '฿1,715');
      await page.goto(`/${locale}`);
      await expect(price(page)).toHaveText(startsInBaht ? 'US$49.00' : '฿1,715');
      expect(problems).toEqual([]);
    });

    test('currency switch: the choice survives a language switch and a trip back (no stale cached page, ADR-0003)', async ({
      page,
    }) => {
      const other = locale === 'en' ? 'th' : 'en';
      // Start with the currency that is NOT this locale's default, then flip it on the other page.
      // `onFirst` / `onOther`: the price as formatted on this locale's page and on the other one.
      const first =
        locale === 'en'
          ? { name: copy.thb, onFirst: '฿1,715', onOther: '฿1,715' }
          : { name: copy.usd, onFirst: 'US$49.00', onOther: '$49.00' };
      const second =
        locale === 'en'
          ? { name: COPY.th.usd, onFirst: '$49.00', onOther: 'US$49.00' }
          : { name: COPY.en.thb, onFirst: '฿1,715', onOther: '฿1,715' };
      await page.goto(`/${locale}`);
      let drawer = await openMenu(page, locale);
      await chooseCurrency(drawer, first.name);
      await expect(price(page)).toHaveText(first.onFirst);

      await drawer.getByRole('link', { name: copy.otherLocale }).click();
      await expect(page).toHaveURL(new RegExp(`/${other}$`));
      await expect(price(page)).toHaveText(first.onOther);

      // Change it on the other page, then go back to the first one: it must not come from a stale cache.
      drawer = await openMenu(page, other);
      await chooseCurrency(drawer, second.name);
      await expect(price(page)).toHaveText(second.onOther);
      await drawer.getByRole('link', { name: COPY[other].otherLocale }).click();
      await expect(page).toHaveURL(new RegExp(`/${locale}$`));
      await expect(price(page)).toHaveText(second.onFirst);
    });

    test('currency: after a full-document trip away and Back, the page shows the cookie currency (history cache)', async ({
      page,
    }) => {
      const startsInBaht = locale === 'th';
      await page.goto(`/${locale}`);
      const drawer = await openMenu(page, locale);
      await chooseCurrency(drawer, startsInBaht ? copy.usd : copy.thb);
      await expect(price(page)).toHaveText(startsInBaht ? 'US$49.00' : '฿1,715');

      // A hard navigation (the 404 page is a separate document), then the browser's Back button.
      await page.goto(`/${locale}/does-not-exist`);
      await page.goBack();

      await expect(price(page)).toHaveText(startsInBaht ? 'US$49.00' : '฿1,715');
    });

    test('renders and runs the menu without console errors, hydration warnings or CSP violations', async ({
      page,
    }) => {
      const problems = await watchProblems(page);

      await page.goto(`/${locale}`);
      await page.waitForLoadState('networkidle');
      const drawer = await openMenu(page, locale);
      await drawer.getByRole('button', { name: copy.closeMenu }).click();
      await expect(drawer).toHaveCount(0);

      expect(problems).toEqual([]);
    });
  });
}

test.describe('menu code is loaded on demand (ADR-0005)', () => {
  test('no dialog code is requested until the menu is used', async ({ page }) => {
    const scripts: string[] = [];
    page.on('response', (response) => {
      if (response.request().resourceType() === 'script') scripts.push(response.url());
    });
    await page.goto('/en');
    await page.waitForLoadState('networkidle');
    const before = scripts.length;

    await openMenu(page, 'en');

    expect(scripts.length).toBeGreaterThan(before);
  });
});

test.describe('server HTML', () => {
  for (const locale of LOCALES) {
    test(`/${locale}: header surface and links are correct before hydration (public paths, no currency segment)`, async ({
      request,
    }) => {
      const html = await (await request.get(`/${locale}`)).text();

      // The hero marker is in the HTML, so the stylesheet can make the header transparent at once.
      expect(html).toContain('data-header-sentinel');
      expect(html).not.toContain('data-past-hero');
      expect(html).toContain(`href="/${locale}"`);
      expect(html).toContain(`href="/${locale}/shop"`);
      expect(html).not.toMatch(/href="\/(en|th)\/(usd|thb)/);
      expect(html).toContain('data-slot="cart-badge"');
    });
  }
});

test.describe('header without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const locale of LOCALES) {
    test(`/${locale}: transparent over the hero from the first paint and scrolls away with it, by CSS alone`, async ({
      page,
    }) => {
      await page.goto(`/${locale}`);
      const header = page.getByRole('banner');

      await expect(header).toHaveCSS('color', 'rgb(247, 244, 239)');
      // Not sticky without the island: a transparent header that followed the visitor would be
      // canvas-coloured text over the canvas-coloured page once the hero has gone.
      await expect(header).toHaveCSS('position', 'absolute');
      expect((await header.boundingBox())?.y).toBe(0);
      const hero = page.locator('[aria-roledescription="carousel"]');
      expect((await hero.boundingBox())?.y).toBe(0);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      expect((await header.boundingBox())?.y ?? 0).toBeLessThan(0);
    });
  }
});
