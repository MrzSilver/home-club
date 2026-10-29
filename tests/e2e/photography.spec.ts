import { expect, test } from '@playwright/test';

import { HERO_IMAGES } from '@/data/brand';
import { CATEGORY_ENTRIES } from '@/data/categories';

for (const locale of ['en', 'th'] as const) {
  for (const currency of ['USD', 'THB']) {
    test(`licensed photography loads with localized hero descriptions: ${locale}/${currency} (FR-010, FR-011)`, async ({
      page,
      context,
      baseURL,
    }, testInfo) => {
      await context.addCookies([{ name: 'hc_currency', value: currency, url: baseURL ?? '' }]);
      await page.goto(`/${locale}`);
      await page.evaluate(() => document.fonts.ready);

      for (const [index, image] of HERO_IMAGES.entries()) {
        const next = locale === 'en' ? 'Next slide' : 'สไลด์ถัดไป';
        if (index > 0) await page.getByRole('button', { name: next, exact: true }).click();
        const active = page.locator('.hero-slide[data-active] img');
        await expect(active).toHaveAttribute('alt', image.alt[locale]);
        await expect(active).toHaveJSProperty('complete', true);
        await expect(active).not.toHaveJSProperty('naturalWidth', 0);
        await page.screenshot({
          path: testInfo.outputPath(`hero-${index + 1}.png`),
          animations: 'disabled',
        });
      }

      for (const category of CATEGORY_ENTRIES) {
        const image = page.locator(`img[src*="${encodeURIComponent(category.image.src)}"]`);
        await image.scrollIntoViewIfNeeded();
        await expect(image).toHaveAttribute('alt', '');
        await expect(image).toHaveJSProperty('complete', true);
        await expect(image).not.toHaveJSProperty('naturalWidth', 0);
        await page.screenshot({
          path: testInfo.outputPath(`category-${category.id}.png`),
          animations: 'disabled',
        });
      }
      await page
        .getByRole('button', {
          name: locale === 'en' ? 'Slide 1 of 3' : 'สไลด์ที่ 1 จาก 3',
          exact: true,
        })
        .click();
      await page
        .locator('[aria-labelledby="categories-heading"] ul')
        .evaluate((node) => node.scrollTo(0, 0));
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: testInfo.outputPath('home.png'),
        fullPage: true,
        animations: 'disabled',
      });
    });
  }
}
