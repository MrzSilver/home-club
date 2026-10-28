import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

// T07: Home page (FR-010, FR-011, FR-012, FR-015, FR-070 to FR-072, FR-004).
const LOCALES = ['en', 'th'] as const;
type Locale = (typeof LOCALES)[number];

const COPY = {
  en: {
    region: 'Featured',
    next: 'Next slide',
    previous: 'Previous slide',
    play: 'Start automatic slide change',
    pause: 'Pause automatic slide change',
    slideButton: (n: number): string => `Slide ${n} of 3`,
    categories: 'Shop by category',
    essentials: 'Essentials',
    trust: 'Why Home Club',
    headline: /start with the essential\.\s*live your vibe\./i,
    secondHeadline: 'Made to move.',
    seeAll: 'See all',
    tiles: ['Foundations', 'Performance', 'Lifestyle', 'Accessories'],
  },
  th: {
    region: 'ไฮไลต์',
    next: 'สไลด์ถัดไป',
    previous: 'สไลด์ก่อนหน้า',
    play: 'เริ่มเลื่อนสไลด์อัตโนมัติ',
    pause: 'หยุดเลื่อนสไลด์อัตโนมัติ',
    slideButton: (n: number): string => `สไลด์ที่ ${n} จาก 3`,
    categories: 'เลือกซื้อตามหมวดหมู่',
    essentials: 'ของต้องมี',
    trust: 'ทำไมต้อง Home Club',
    headline: /เริ่มที่ความเรียบง่าย\s*แล้วใช้ชีวิตให้เป็นสไตล์คุณ/,
    secondHeadline: 'ขยับได้เต็มที่',
    seeAll: 'ดูทั้งหมด',
    tiles: ['ไอเท็มพื้นฐาน', 'ออกกำลังกาย', 'ไลฟ์สไตล์', 'แอคเซสซอรี่'],
  },
} as const;

const PRICES = {
  USD: {
    en: ['$49.00', '$89.00', '$59.00', '$39.00'],
    th: ['US$49.00', 'US$89.00', 'US$59.00', 'US$39.00'],
  },
  THB: {
    en: ['฿1,715', '฿3,115', '฿2,065', '฿1,365'],
    th: ['฿1,715', '฿3,115', '฿2,065', '฿1,365'],
  },
} as const;

const activeSlide = (page: Page): Locator => page.locator('.hero-slide[data-active]');

/** Collects console errors, warnings and page errors (hydration problems are logged as errors). */
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

for (const locale of LOCALES) {
  const copy = COPY[locale];

  test.describe(`/${locale}`, () => {
    test('shows hero, category tiles, essentials and trust strip in that order, with one h1', async ({
      page,
    }) => {
      const problems = watchConsole(page);
      await page.goto(`/${locale}`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(copy.headline);

      const tops = await Promise.all(
        [
          page.getByRole('region', { name: copy.region }),
          page.getByRole('region', { name: copy.categories }),
          page.getByRole('region', { name: copy.essentials }),
          page.getByRole('region', { name: copy.trust }),
        ].map(async (section) => (await section.boundingBox())?.y ?? Number.NaN),
      );
      expect([...tops].sort((a, b) => a - b)).toEqual(tops);
      expect(tops.every((top) => Number.isFinite(top))).toBe(true);
      expect(problems).toEqual([]);
    });

    test('hero: no autoplay, previous/next/indicators work by keyboard and announce, play toggles', async ({
      page,
    }) => {
      await page.goto(`/${locale}`);
      await page.waitForLoadState('networkidle');
      const active = activeSlide(page);

      // Nothing moves by itself.
      await page.waitForTimeout(1500);
      await expect(active).toHaveAttribute('aria-label', /^(1|สไลด์ที่ 1|1 จาก)/);
      await expect(page.getByRole('button', { name: copy.play })).toBeVisible();

      const next = page.getByRole('button', { name: copy.next });
      await next.focus();
      await page.keyboard.press('Enter');
      await expect(active).toContainText(copy.secondHeadline);
      // A visitor action is announced, politely.
      await expect(page.locator('.hero').getByRole('status')).toHaveText(copy.slideButton(2));
      await page.keyboard.press('Space');
      await expect(active).toHaveAttribute('aria-label', /3/);
      await page.keyboard.press('Space');
      await expect(active).toHaveAttribute('aria-label', /1/);

      await page.getByRole('button', { name: copy.previous }).focus();
      await page.keyboard.press('Enter');
      await page.getByRole('button', { name: copy.slideButton(1) }).focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('button', { name: copy.slideButton(1) })).toHaveAttribute(
        'aria-current',
        'true',
      );

      // Only the visible slide is reachable: no tab stops or text in hidden slides.
      await expect(page.locator('.hero-slide a:visible')).toHaveCount(1);

      // Tab order inside the hero: indicators, previous, play, next, then the slide's CTA is earlier.
      await page.getByRole('button', { name: copy.play }).focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('button', { name: copy.pause })).toBeVisible();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('button', { name: copy.play })).toBeVisible();
    });

    test('hero: keyboard focus on the controls and the slide button uses the light ring', async ({
      page,
    }) => {
      await page.goto(`/${locale}`);
      const next = page.getByRole('button', { name: copy.next });
      await page.keyboard.press('Tab'); // skip link
      await next.focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await expect(next).toBeFocused();
      await expect(next).toHaveCSS('outline-color', 'rgb(157, 184, 255)');
      const cta = activeSlide(page).getByRole('link');
      await page.keyboard.press('Tab'); // leaves the hero
      await cta.focus();
      await expect(cta).toHaveCSS('outline-color', 'rgb(157, 184, 255)');
    });

    test('category tiles are four whole-tile links to the collections', async ({ page }) => {
      await page.goto(`/${locale}`);
      const tiles = page.getByRole('region', { name: copy.categories }).getByRole('link');
      await expect(tiles).toHaveCount(4);
      const categories = ['foundations', 'performance', 'lifestyle', 'accessories'];
      for (const [index, category] of categories.entries()) {
        const tile = tiles.nth(index);
        await expect(tile).toHaveAttribute('href', `/${locale}/collections/${category}`);
        await expect(tile).toContainText(copy.tiles[index] ?? '');
      }
      // Each tile is at least 44 px in both directions (RULES 8.3).
      for (let index = 0; index < 4; index += 1) {
        const box = await tiles.nth(index).boundingBox();
        expect(box?.width).toBeGreaterThanOrEqual(44);
        expect(box?.height).toBeGreaterThanOrEqual(44);
      }
    });

    for (const currency of ['USD', 'THB'] as const) {
      test(`essentials: four cards with the right ${currency} prices, one link each, swatch names for assistive tech`, async ({
        page,
        context,
        baseURL,
      }) => {
        await context.addCookies([{ name: 'hc_currency', value: currency, url: baseURL ?? '' }]);
        const problems = watchConsole(page);
        await page.goto(`/${locale}`);
        await page.waitForLoadState('networkidle');

        const section = page.getByRole('region', { name: copy.essentials });
        const cards = section.getByRole('listitem');
        await expect(cards).toHaveCount(4);
        await expect(section.getByTestId('product-price')).toHaveText([
          ...PRICES[currency][locale],
        ]);
        for (let index = 0; index < 4; index += 1) {
          const card = cards.nth(index);
          await expect(card.getByRole('link')).toHaveCount(1);
          await expect(card.locator('a')).toHaveAttribute('href', /\/products\//);
          await expect(card.locator('a button, a input, a a')).toHaveCount(0);
        }
        await expect(section.getByRole('link', { name: copy.seeAll })).toHaveAttribute(
          'href',
          `/${locale}/shop`,
        );
        expect(problems).toEqual([]);
      });
    }

    test('trust strip lists the three promises', async ({ page }) => {
      await page.goto(`/${locale}`);
      const strip = page.getByRole('region', { name: copy.trust });
      await expect(strip.getByRole('listitem')).toHaveCount(3);
    });

    test('has no layout shift while loading, hydrating and using the hero', async ({
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
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => document.fonts.ready);
      await page.getByRole('button', { name: copy.next }).click();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.evaluate(() => window.scrollTo(0, 0));

      const shift = await page.evaluate(() => (window as unknown as { __shift: number }).__shift);
      // The one accepted exception (ADR-0001): Thai on desktop re-wraps the display headline when
      // Noto Sans Thai swaps in (about 0.018, far under the 0.1 budget). Everything else stays at 0.
      if (locale === 'th' && testInfo.project.name === 'desktop') expect(shift).toBeLessThan(0.02);
      else expect(shift).toBe(0);
    });

    test('only the first hero picture is eager and high priority', async ({ page }) => {
      await page.goto(`/${locale}`);
      const images = page.locator('.hero img');
      await expect(images).toHaveCount(3);
      await expect(images.nth(0)).toHaveAttribute('fetchpriority', 'high');
      await expect(images.nth(1)).toHaveAttribute('loading', 'lazy');
      await expect(images.nth(2)).toHaveAttribute('loading', 'lazy');
    });

    test('inactive hero slides are not rendered and their pictures are not requested until shown', async ({
      page,
    }) => {
      const requested: string[] = [];
      page.on('request', (request) => {
        const url = decodeURIComponent(request.url());
        if (url.includes('/images/brand/hero-')) requested.push(url);
      });
      await page.goto(`/${locale}`);
      await page.waitForLoadState('networkidle');

      const slides = page.locator('.hero-slide');
      await expect(slides.nth(0)).toHaveCSS('content-visibility', 'visible');
      await expect(slides.nth(1)).toHaveCSS('content-visibility', 'hidden');
      await expect(slides.nth(2)).toHaveCSS('content-visibility', 'hidden');
      expect(requested.some((url) => url.includes('hero-1'))).toBe(true);
      expect(requested.some((url) => url.includes('hero-2') || url.includes('hero-3'))).toBe(false);

      await page.getByRole('button', { name: copy.slideButton(3) }).click();
      await expect(slides.nth(2)).toHaveCSS('content-visibility', 'visible');
      await expect.poll(() => requested.some((url) => url.includes('hero-3'))).toBe(true);
    });

    test('cross-fade keeps the outgoing slide rendered until the fade has finished', async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.goto(`/${locale}`);
      await page.waitForLoadState('networkidle');
      const slides = page.locator('.hero-slide');
      const state = (index: number): Promise<string> =>
        slides
          .nth(index)
          .evaluate(
            (node) =>
              `${getComputedStyle(node).contentVisibility}/${getComputedStyle(node).visibility}/${Number(getComputedStyle(node).opacity).toFixed(1)}`,
          );

      await page.getByRole('button', { name: copy.slideButton(2) }).click();
      await page.waitForTimeout(120);
      // Mid-fade (--dur-slow is 400 ms): slide 1 is still drawn, slide 2 is on its way in.
      expect(await state(0)).toMatch(/^visible\/visible\//);
      expect(await state(1)).toMatch(/^visible\/visible\//);
      // After the fade the outgoing slide leaves the tree.
      await expect.poll(() => state(0)).toBe('hidden/hidden/0.0');
      expect(await state(1)).toBe('visible/visible/1.0');
    });

    test('with reduced motion the slide still switches and the old one is gone at once', async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`/${locale}`);
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: copy.slideButton(2) }).click();
      await expect(activeSlide(page)).toContainText(copy.secondHeadline);
      const slides = page.locator('.hero-slide');
      await expect(slides.nth(0)).toHaveCSS('content-visibility', 'hidden', { timeout: 1000 });
      await expect(slides.nth(1)).toHaveCSS('content-visibility', 'visible');
    });

    test(
      'axe: Home has no critical or serious violations on each slide',
      { tag: '@a11y' },
      async ({ page }) => {
        await page.goto(`/${locale}`);
        for (const slide of [1, 2, 3]) {
          await page.getByRole('button', { name: copy.slideButton(slide) }).click();
          await page.waitForTimeout(500);
          const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
            .analyze();
          const blocking = results.violations.filter(
            (violation) => violation.impact === 'critical' || violation.impact === 'serious',
          );
          expect(blocking.map((violation) => violation.id)).toEqual([]);
        }
      },
    );
  });
}

test.describe('server HTML', () => {
  for (const locale of LOCALES) {
    test(`/${locale}: every slide, the price in the visitor's currency and no currency segment are in the first HTML`, async ({
      request,
    }) => {
      const html = await (await request.get(`/${locale}`)).text();
      const copy = COPY[locale as Locale];

      expect(html).toContain(copy.secondHeadline);
      expect((html.match(/<h1/g) ?? []).length).toBe(1);
      expect(html).toContain(locale === 'en' ? '$49.00' : '฿1,715');
      expect(html).not.toMatch(/href="\/(en|th)\/(usd|thb)/);
      expect(html).toContain(`href="/${locale}/collections/foundations"`);
    });
  }
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the play control is inert and says why, and the slides never advance', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');
    const play = page.getByRole('button', { name: COPY.en.play });
    await expect(play).toHaveAttribute('aria-disabled', 'true');
    await expect(play).toHaveAccessibleDescription(/less motion/);
    await play.click({ force: true });
    await page.waitForTimeout(1500);
    await expect(play).toBeVisible();
    await expect(activeSlide(page)).toHaveAttribute('aria-label', /^1/);
  });

  test('the slide change is instant (no fade longer than 100 ms)', async ({ page }) => {
    await page.goto('/en');
    const slide = page.locator('.hero-slide').first();
    const duration = await slide.evaluate((node) => getComputedStyle(node).transitionDuration);
    for (const part of duration.split(',')) {
      expect(Number.parseFloat(part) * (part.trim().endsWith('ms') ? 1 : 1000)).toBeLessThanOrEqual(
        100,
      );
    }
  });
});

test.describe('Home without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('shows the whole page: slide one with its headline and links, tiles and prices', async ({
    page,
  }) => {
    await page.goto('/en');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Discover' })).toBeVisible();
    await expect(page.getByTestId('product-price').first()).toHaveText('$49.00');
    await expect(
      page.getByRole('region', { name: COPY.en.categories }).getByRole('link'),
    ).toHaveCount(4);
  });
});
