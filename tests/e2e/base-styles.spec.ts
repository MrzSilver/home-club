import { expect, test } from '@playwright/test';

// T02: tokens, fonts and base styles as the browser actually computes them (FR-004, FR-073).
const ROUTE = '/en';

test.describe('base styles', () => {
  test('the skip link is the first tab stop, appears on focus and shows the focus ring (FR-004)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const skip = page.getByRole('link', { name: /skip/i });

    await expect(skip).toHaveCSS('opacity', '0');
    await page.keyboard.press('Tab');
    await expect(skip).toBeFocused();
    await expect(skip).toHaveCSS('opacity', '1');
    await expect(skip).toHaveCSS('outline-style', 'solid');
    await expect(skip).toHaveCSS('outline-width', '2px');
    await expect(skip).toHaveCSS('outline-offset', '2px');
    await expect(skip).toHaveCSS('outline-color', 'rgb(31, 79, 216)');

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main$/);
    await expect(page.locator('main#main')).toBeVisible();
  });

  test('the page uses the self-hosted fonts and the canvas and ink tokens', async ({ page }) => {
    await page.goto(ROUTE);
    await page.evaluate(() => document.fonts.ready);

    const body = page.locator('body');
    await expect(body).toHaveCSS('background-color', 'rgb(247, 244, 239)');
    await expect(body).toHaveCSS('color', 'rgb(20, 20, 18)');
    await expect(body).toHaveCSS('font-family', /inter/i);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('font-family', /jost/i);

    const loaded = await page.evaluate(() =>
      [...document.fonts].filter((font) => font.status === 'loaded').map((font) => font.family),
    );
    expect(loaded.some((family) => /jost/i.test(family))).toBe(true);
    expect(loaded.some((family) => /inter/i.test(family))).toBe(true);
  });

  test('English pages fetch no Noto Sans Thai until the menu shows the Thai locale label, then only one weight (FR-073)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    await page.evaluate(() => document.fonts.ready);
    const loadedNoto = (): Promise<string[]> =>
      page.evaluate(() =>
        [...document.fonts]
          .filter((font) => font.status === 'loaded' && /noto/i.test(font.family))
          .map((font) => font.weight),
      );

    // The locale name "ไทย" (lang="th") is the only Thai text on /en and it lives in the menu drawer,
    // so nothing Thai is on the page, and no Noto file is requested, until the drawer opens.
    expect(await loadedNoto()).toEqual([]);

    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    // The unicode-range split means no other Noto file is requested.
    await expect.poll(loadedNoto).toEqual(['400']);
  });

  test('English labels are uppercase and tracked; Thai text is neither (RULES 6.5, FR-073)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const results = await page.evaluate(() => {
      const probe = (lang: string): Record<string, string> => {
        const host = document.createElement('div');
        host.lang = lang;
        host.innerHTML =
          '<p class="text-eyebrow uppercase-latin">label</p><p class="text-body">x</p>';
        document.body.append(host);
        const label = getComputedStyle(host.querySelector('p.text-eyebrow') as Element);
        const body = getComputedStyle(host.querySelector('p.text-body') as Element);
        const out = {
          transform: label.textTransform,
          tracking: label.letterSpacing,
          leading: body.lineHeight,
          fontSize: body.fontSize,
          family: body.fontFamily,
        };
        host.remove();
        return out;
      };
      return { en: probe('en'), th: probe('th') };
    });

    expect(results.en['transform']).toBe('uppercase');
    expect(parseFloat(results.en['tracking'] ?? '0')).toBeGreaterThan(0);
    expect(results.en['leading']).toBe('25.6px');
    expect(results.th['transform']).toBe('none');
    // `letter-spacing: 0` computes to "normal" in Chromium.
    expect(['0px', 'normal']).toContain(results.th['tracking']);
    expect(results.th['leading']).toBe('28px');
    expect(parseFloat(results.th['fontSize'] ?? '0')).toBeGreaterThanOrEqual(16);
    const thaiFamily = results.th['family'] ?? '';
    expect(thaiFamily.indexOf('notoSansThai')).toBeGreaterThanOrEqual(0);
    expect(thaiFamily.indexOf('notoSansThai')).toBeLessThan(thaiFamily.indexOf('inter'));
  });

  test('Thai text renders in Noto Sans Thai, while the lang="en" wordmark keeps its casing and tracking on a Thai page (FR-073)', async ({
    page,
  }) => {
    await page.goto(ROUTE);
    const result = await page.evaluate(async () => {
      const host = document.createElement('div');
      host.lang = 'th';
      host.innerHTML =
        '<p class="text-h2 uppercase-latin" id="th-heading">สวัสดี ยินดีต้อนรับ</p>' +
        '<span id="brand" lang="en" class="text-wordmark uppercase">Home Club</span>';
      document.body.append(host);
      await document.fonts.ready;
      await document.fonts.load('500 20px "notoSansThai"', 'สวัสดี');

      const heading = getComputedStyle(host.querySelector('#th-heading') as Element);
      const brand = getComputedStyle(host.querySelector('#brand') as Element);
      const loaded = [...document.fonts]
        .filter((font) => font.status === 'loaded')
        .map((font) => font.family);
      const out = {
        headingTransform: heading.textTransform,
        headingTracking: heading.letterSpacing,
        headingLeading: heading.lineHeight,
        headingSize: parseFloat(heading.fontSize),
        brandTransform: brand.textTransform,
        brandTracking: parseFloat(brand.letterSpacing),
        loaded,
      };
      host.remove();
      return out;
    });

    expect(result.headingTransform).toBe('none');
    expect(['0px', 'normal']).toContain(result.headingTracking);
    // text-h2 on Thai uses the 1.4 Thai line-height.
    expect(parseFloat(result.headingLeading)).toBeCloseTo(result.headingSize * 1.4, 1);
    expect(result.brandTransform).toBe('uppercase');
    expect(result.brandTracking).toBeGreaterThan(0);
    expect(result.loaded.some((family) => /noto/i.test(family))).toBe(true);
  });

  test('reduced motion shortens durations to 100ms or less (DESIGN 7)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(ROUTE);

    const durations = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return ['--dur-fast', '--dur-base', '--dur-slow'].map((name) => {
        // The minifier may print 100ms as .1s, so normalise to milliseconds.
        const value = style.getPropertyValue(name).trim();
        return value.endsWith('ms') ? parseFloat(value) : parseFloat(value) * 1000;
      });
    });

    expect(durations).toEqual([80, 100, 100]);
  });

  test('text reflows at 320px without horizontal scrolling (DESIGN 11)', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(ROUTE);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
});
