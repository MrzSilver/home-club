import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

const IMAGE_URLS = ['**/_next/image**', '**/images/**'];

async function blockImages(page: Page): Promise<void> {
  for (const pattern of IMAGE_URLS) await page.route(pattern, (route) => route.abort());
}

async function size(locator: Locator): Promise<{ width: number; height: number }> {
  const box = await locator.boundingBox();
  if (box === null) throw new Error('element has no box');
  return { width: Math.round(box.width), height: Math.round(box.height) };
}

async function blocking(page: Page): Promise<{ id: string; nodes: number }[]> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return results.violations
    .filter((v) => v.impact === 'critical' || v.impact === 'serious')
    .map((v) => ({ id: v.id, nodes: v.nodes.length }));
}

const CART = JSON.stringify({
  version: 1,
  state: { lines: [{ sku: 'premium-hoodie-sand-M', qty: 1 }] },
});

for (const locale of ['en', 'th'] as const) {
  test.describe(`image failure /${locale} (SPEC 13a)`, () => {
    test('product gallery shows labelled placeholders and keeps its box', async ({ page }) => {
      const url = `/${locale}/products/essential-tee`;
      const frame = page.locator('section[role="region"] .aspect-gallery, .aspect-gallery').first();
      await page.goto(url);
      await expect(frame.locator('img')).toBeVisible();
      await page.waitForLoadState('networkidle');
      const before = await size(frame);

      await blockImages(page);
      await page.reload();
      const fallback = frame.locator('[data-image-fallback]');
      await expect(fallback).toBeVisible();
      const name = await fallback.getAttribute('aria-label');
      expect(name).toBeTruthy();
      await expect(fallback).toHaveAttribute('role', 'img');
      // Thumbnails are decorative: hidden empty boxes, so the name is announced once.
      await expect(page.locator('button [data-image-fallback]').first()).toHaveAttribute(
        'aria-hidden',
        'true',
      );
      expect(await size(frame)).toEqual(before);
      const results = await new AxeBuilder({ page }).analyze();
      expect(
        results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious'),
      ).toEqual([]);
    });

    test('cart line thumbnail falls back without moving the line', async ({ page }) => {
      await page.addInitScript((cart) => {
        if (!localStorage.getItem('hc:cart:v1')) localStorage.setItem('hc:cart:v1', cart);
      }, CART);
      const thumb = page.locator('main li').first().locator('> :first-child');
      await page.goto(`/${locale}/cart`);
      await expect(thumb).toHaveJSProperty('tagName', 'IMG');
      // The thumbnail is lazy: wait for the bytes so the baseline is the real picture.
      await expect
        .poll(() => thumb.evaluate((el) => (el as HTMLImageElement).naturalWidth))
        .toBeGreaterThan(0);
      const before = await size(thumb);

      await blockImages(page);
      await page.reload();
      await expect(page.locator('main li [data-image-fallback]')).toHaveAttribute('role', 'img');
      expect(await size(thumb)).toEqual(before);
      expect(await blocking(page)).toEqual([]);
    });

    test('cart with a line has no critical or serious axe violations @a11y', async ({ page }) => {
      await page.addInitScript((cart) => {
        if (!localStorage.getItem('hc:cart:v1')) localStorage.setItem('hc:cart:v1', cart);
      }, CART);
      await page.goto(`/${locale}/cart`);
      await expect(page.locator('main li').first()).toBeVisible();
      await page.waitForLoadState('networkidle');
      expect(await blocking(page)).toEqual([]);
    });

    test('search with no results offers clear and shop-all recovery (SPEC 13a) @a11y', async ({
      page,
    }) => {
      const th = locale === 'th';
      await page.goto(`/${locale}/search?q=zzzz-no-match`);
      const field = page.getByRole('main').getByRole('searchbox');
      await expect(
        page.getByRole('main').getByText(th ? 'ไม่พบสินค้า' : 'No matches'),
      ).toBeVisible();
      expect(await blocking(page)).toEqual([]);
      const shop = page
        .getByRole('main')
        .getByRole('link', { name: th ? 'ดูสินค้าทั้งหมด' : 'Shop all' });
      await expect(shop).toHaveAttribute('href', `/${locale}/shop`);
      await page.getByRole('button', { name: th ? 'ล้างการค้นหา' : 'Clear search' }).click();
      await expect(field).toHaveValue('');
      await expect(field).toBeFocused();
      await expect(shop).toBeHidden();
    });

    for (const reduced of [false, true]) {
      test(`cart drawer panel ${reduced ? 'fades without moving' : 'slides in'} (DESIGN 7)`, async ({
        page,
      }) => {
        await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
        await page.goto(`/${locale}`);
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: locale === 'th' ? 'ตะกร้าสินค้า' : 'Cart' }).click();
        const panel = page.getByRole('dialog');
        await expect(panel).toBeVisible();
        // Computed style, not getAnimations(): the animation may already be over when we look.
        const style = await panel.evaluate((el) => {
          const computed = getComputedStyle(el);
          return { name: computed.animationName, duration: computed.animationDuration };
        });
        const milliseconds = style.duration.endsWith('ms')
          ? Number.parseFloat(style.duration)
          : Number.parseFloat(style.duration) * 1000;
        if (reduced) {
          expect(style.name).toBe('fade-in');
          expect(milliseconds).toBeLessThanOrEqual(100);
        } else {
          expect(style.name).toBe('slide-in-end');
          expect(milliseconds).toBeGreaterThan(100);
        }
      });
    }

    test('catalogue cards stay 1:1 on the surface backdrop and keep their name (CSS only)', async ({
      page,
    }) => {
      await blockImages(page);
      await page.goto(`/${locale}/shop`);
      const card = page.locator('[data-product-card="essential-tee"]');
      await expect(card).toBeVisible();
      const box = await size(card.locator('.aspect-card'));
      expect(box.width).toBeGreaterThan(100);
      expect(Math.abs(box.width - box.height)).toBeLessThanOrEqual(1);
      // The pictures are decorative (alt=""); the link's name comes from the product name text.
      const name = (await card.getByRole('link').first().innerText()).trim();
      expect(name.length).toBeGreaterThan(0);
    });
  });
}
