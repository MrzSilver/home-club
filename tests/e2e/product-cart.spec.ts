import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

for (const locale of ['en', 'th'] as const) {
  const copy =
    locale === 'en'
      ? {
          add: 'Add to cart',
          cart: 'Cart',
          close: 'Close cart',
          size: 'Size',
          qty: 'Quantity',
          view: 'View cart',
          empty: 'Your cart is empty',
          remove: 'Remove',
          color: 'Colour',
          black: 'Black',
        }
      : {
          add: 'เพิ่มลงตะกร้า',
          cart: 'ตะกร้าสินค้า',
          close: 'ปิดตะกร้า',
          size: 'ขนาด',
          qty: 'จำนวน',
          view: 'ดูตะกร้า',
          empty: 'ยังไม่มีสินค้าในตะกร้า',
          remove: 'นำออก',
          color: 'สี',
          black: 'ดำ',
        };
  test.describe(`product and cart /${locale} (FR-030–033, FR-050–051)`, () => {
    test('browse to product, choose stock, add, change quantity, reload and remove', async ({
      page,
    }) => {
      const problems: string[] = [];
      page.on('pageerror', (error) => problems.push(error.message));
      await page.goto(`/${locale}/shop`);
      await page.locator(`a[href="/${locale}/products/essential-tee"]`).first().click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        locale === 'en' ? 'Essential Tee' : 'เสื้อยืดพื้นฐาน',
      );
      const add = page.getByRole('button', { name: copy.add, exact: true });
      await expect(add).toHaveAttribute('aria-disabled', 'true');
      const sizes = page.getByRole('group', { name: copy.size, exact: true });
      await expect(sizes.getByRole('radio', { name: /^XXL/ })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      await sizes.getByRole('radio', { name: 'XS', exact: true }).check();
      await expect(page.getByRole('status')).toContainText(
        locale === 'en' ? 'Only 3 left' : 'เหลือเพียง 3 ชิ้น',
      );
      await page.getByRole('combobox', { name: copy.qty, exact: true }).selectOption('3');
      await add.click();
      const drawer = page.getByRole('dialog');
      await expect(drawer).toBeVisible();
      await expect(drawer.getByRole('combobox')).toHaveValue('3');
      await drawer.getByRole('combobox').selectOption('2');
      await page.keyboard.press('Escape');
      await expect(add).toBeFocused();
      await page
        .getByRole('banner')
        .getByRole('button', { name: new RegExp(copy.cart) })
        .click();
      await page.getByRole('link', { name: copy.view, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/cart$`));
      await expect(page.getByRole('combobox')).toHaveValue('2');
      await page.reload();
      await expect(page.getByRole('combobox')).toHaveValue('2');
      await expect(page.getByTestId('cart-subtotal')).toHaveAttribute(
        'data-currency',
        locale === 'en' ? 'USD' : 'THB',
      );
      await page
        .getByRole('button', { name: new RegExp(locale === 'en' ? '^Remove ' : '^นำ .+ ออก$') })
        .click();
      await expect(page.getByRole('status')).toContainText(copy.empty);
      expect(problems).toEqual([]);
    });
    test('gallery thumbnails and keyboard interaction work; unavailable combinations remain inert', async ({
      page,
    }) => {
      await page.goto(`/${locale}/products/essential-tee`);
      const sizes = page.getByRole('group', { name: copy.size, exact: true });
      const unavailable = sizes.getByRole('radio', { name: /^XXL/ });
      await unavailable.click({ force: true });
      await expect(unavailable).not.toBeChecked();
      await page
        .getByRole('button', { name: locale === 'en' ? 'View image 2' : 'ดูภาพที่ 2', exact: true })
        .click();
      await page
        .getByRole('group', { name: copy.color, exact: true })
        .getByRole('radio', { name: copy.black, exact: true })
        .check();
      await sizes.getByRole('radio', { name: 'XXL', exact: true }).check();
      await expect(page.getByRole('button', { name: copy.add })).not.toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });
    test('currency switches reprice the cart and survive reload (FR-002, FR-072)', async ({
      page,
    }) => {
      await page.goto(`/${locale}/products/essential-tee`);
      await page
        .getByRole('group', { name: copy.size, exact: true })
        .getByRole('radio', { name: 'XS', exact: true })
        .check();
      await page.getByRole('button', { name: copy.add }).click();
      await page.getByRole('link', { name: copy.view, exact: true }).click();
      const target = locale === 'en' ? 'THB' : 'USD';
      await page.getByRole('button', { name: locale === 'en' ? 'Open menu' : 'เปิดเมนู' }).click();
      await page
        .getByText(target === 'THB' ? /Thai baht|บาทไทย/ : /US dollar|ดอลลาร์สหรัฐ/, {
          exact: false,
        })
        .click();
      await page.getByRole('button', { name: locale === 'en' ? 'Close menu' : 'ปิดเมนู' }).click();
      await expect(page.getByTestId('cart-subtotal')).toHaveAttribute('data-currency', target);
      await expect(page.getByTestId('cart-subtotal')).toContainText(
        target === 'THB' ? '1,715' : '49.00',
      );
      await page.reload();
      await expect(page.getByTestId('cart-subtotal')).toHaveAttribute('data-currency', target);
      await expect(page.getByRole('combobox')).toHaveValue('1');
    });
    test('navigating to another product starts a fresh variant selection (FR-031)', async ({
      page,
    }) => {
      await page.addInitScript(() => {
        if (!localStorage.getItem('hc:cart:v1'))
          localStorage.setItem(
            'hc:cart:v1',
            JSON.stringify({
              version: 1,
              state: { lines: [{ sku: 'premium-hoodie-sand-M', qty: 1 }] },
            }),
          );
      });
      await page.goto(`/${locale}/products/essential-tee`);
      await page
        .getByRole('group', { name: copy.size, exact: true })
        .getByRole('radio', { name: 'XS', exact: true })
        .check();
      await page.getByRole('button', { name: copy.add }).click();
      await page
        .getByRole('dialog')
        .locator(`a[href="/${locale}/products/premium-hoodie"]`)
        .click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/products/premium-hoodie$`));
      await expect(page.getByRole('button', { name: copy.add })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      await expect(
        page.getByRole('group', { name: copy.size, exact: true }).locator('input:checked'),
      ).toHaveCount(0);
    });
    test('captures product/cart/drawer evidence in both currencies (FR-073)', async ({
      page,
    }, testInfo) => {
      for (const currency of ['USD', 'THB']) {
        await page
          .context()
          .addCookies([{ name: 'hc_currency', value: currency, url: 'http://localhost:3000' }]);
        await page.goto(`/${locale}/products/essential-tee`);
        await page
          .getByRole('group', { name: copy.size, exact: true })
          .getByRole('radio', { name: 'XS', exact: true })
          .check();
        await page.evaluate(() => window.scrollTo(0, 0));
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await page.screenshot({
          path: testInfo.outputPath(`product-${locale}-${currency}.png`),
          fullPage: true,
        });
        await page.getByRole('button', { name: copy.add }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.screenshot({
          path: testInfo.outputPath(`drawer-${locale}-${currency}.png`),
          fullPage: false,
        });
        await page.getByRole('link', { name: copy.view, exact: true }).click();
        await page.screenshot({
          path: testInfo.outputPath(`cart-${locale}-${currency}.png`),
          fullPage: true,
        });
      }
    });
    test('corrupt and stale localStorage recover without breaking the page', async ({ page }) => {
      await page.addInitScript(() => {
        if (localStorage.getItem('hc:cart:v1') === null)
          localStorage.setItem('hc:cart:v1', 'not-json');
      });
      await page.goto(`/${locale}/cart`);
      await expect(page.getByRole('status')).toContainText(copy.empty);
      await page.evaluate(() =>
        localStorage.setItem(
          'hc:cart:v1',
          JSON.stringify({
            version: 1,
            state: {
              lines: [
                { sku: 'retired-tee', qty: 2 },
                { sku: 'essential-tee-sand-XS', qty: 99 },
              ],
            },
          }),
        ),
      );
      await page.reload();
      await expect(page.getByRole('combobox')).toHaveValue('3');
      expect(
        await page.evaluate(() => JSON.parse(localStorage.getItem('hc:cart:v1') ?? 'null')),
      ).toEqual({ version: 1, state: { lines: [{ sku: 'essential-tee-sand-XS', qty: 3 }] } });
    });
    test(
      'populated drawer is accessible and traps/returns keyboard focus',
      { tag: '@a11y' },
      async ({ page }) => {
        await page.goto(`/${locale}/products/essential-tee`);
        await page
          .getByRole('group', { name: copy.size, exact: true })
          .getByRole('radio', { name: 'XS', exact: true })
          .check();
        const add = page.getByRole('button', { name: copy.add });
        await add.click();
        const drawer = page.getByRole('dialog');
        await expect(drawer).toBeVisible();
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze();
        expect(
          results.violations.filter(
            (item) => item.impact === 'critical' || item.impact === 'serious',
          ),
        ).toEqual([]);
        for (let i = 0; i < 8; i++) {
          await page.keyboard.press('Tab');
          await expect(drawer).toContainText(copy.view);
          expect(await drawer.evaluate((node) => node.contains(document.activeElement))).toBe(true);
        }
        await page.keyboard.press('Escape');
        await expect(add).toBeFocused();
      },
    );
  });
}
