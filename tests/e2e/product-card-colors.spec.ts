import { expect, test } from '@playwright/test';

for (const locale of ['en', 'th'] as const) {
  for (const route of ['', '/shop']) {
    test(`product card colours change locally: ${locale}${route || '/home'} (FR-022)`, async ({
      page,
    }, testInfo) => {
      await page.goto(`/${locale}${route}`);
      const card = page.locator('[data-product-card="essential-tee"]');
      const initialUrl = page.url();
      const black = card.getByRole('button', {
        name: locale === 'en' ? 'Black' : 'ดำ',
        exact: true,
      });
      await black.click();
      await expect(black).toHaveAttribute('aria-pressed', 'true');
      await expect(card.locator('img').nth(0)).toHaveAttribute('src', /black-1/);
      await expect(card.locator('img').nth(1)).toHaveAttribute('src', /black-2/);
      await expect(page).toHaveURL(initialUrl);

      const white = card.getByRole('button', {
        name: locale === 'en' ? 'White' : 'ขาว',
        exact: true,
      });
      await white.focus();
      await page.keyboard.press('Enter');
      await expect(white).toHaveAttribute('aria-pressed', 'true');
      await expect(black).toHaveAttribute('aria-pressed', 'false');
      await expect(card.locator('img').nth(0)).toHaveAttribute('src', /white-1/);
      await expect(card.locator('img').nth(0)).toHaveJSProperty('complete', true);
      await expect(card.locator('img').nth(0)).not.toHaveJSProperty('naturalWidth', 0);
      await expect(page).toHaveURL(initialUrl);
      await card.screenshot({ path: testInfo.outputPath('selected-colour.png') });
      await card.getByRole('link').click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/products/essential-tee`));
    });
  }
}
