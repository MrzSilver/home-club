import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

for (const locale of ['en', 'th'] as const) {
  const th = locale === 'th';
  test(`search overlay supports keyboard, results, empty state and focus return ${locale} (FR-023) @a11y`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/shop`);
    const trigger = page.getByRole('button', { name: th ? 'ค้นหา' : 'Search', exact: true });
    await trigger.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const field = dialog.getByRole('searchbox');
    await expect(field).toBeFocused();
    await field.fill(th ? 'เสื้อยืดพื้นฐาน' : 'essential tee');
    await expect(
      dialog.getByRole('link', { name: th ? /เสื้อยืดพื้นฐาน/ : /Essential Tee/ }),
    ).toBeVisible();
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual(
      [],
    );
    await field.fill('zzzz-no-match');
    await expect(dialog.getByRole('status')).toContainText('0');
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await page.goto(`/${locale}/search?q=${encodeURIComponent(th ? 'หมวก' : 'cap')}`);
    await expect(
      page.getByRole('main').getByRole('link', { name: th ? /หมวกแก๊ป/ : /Classic Cap/ }),
    ).toBeVisible();
  });
  test(`demo checkout validates, clears cart and stores no contact details ${locale} (FR-053–055) @a11y`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/looks/the-essential-look`);
    await page
      .getByRole('button', { name: th ? 'เพิ่มทั้งลุคลงตะกร้า' : 'Add the look', exact: true })
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.goto(`/${locale}/checkout`);
    const submit = page.getByRole('button', { name: th ? 'สั่งซื้อแบบเดโม' : 'Place demo order' });
    await submit.click();
    await expect(page.getByRole('main').getByRole('alert')).toBeFocused();
    await expect(page.locator('#checkout-email')).toHaveAttribute('aria-invalid', 'true');
    const values = {
      name: 'Demo Customer',
      email: 'demo@example.com',
      address: '123 Example Road',
      city: 'Example City',
      postalCode: '10000',
      country: 'Thailand',
    };
    for (const [field, value] of Object.entries(values))
      await page.locator(`#checkout-${field}`).fill(value);
    await page.locator('#checkout-shipping').selectOption('express');
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual(
      [],
    );
    const posts: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST') posts.push(request.url());
    });
    await submit.click();
    await expect(page).toHaveURL(/checkout\/success\?order=HC-DEMO-/);
    await expect(page.getByRole('main').getByRole('status')).toContainText('HC-DEMO-');
    expect(posts).toEqual([]);
    expect(
      await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage })),
    ).not.toContain('demo@example.com');
    expect(await page.evaluate(() => localStorage.getItem('hc:cart:v1'))).toBeNull();
    await page.goto(`/${locale}/checkout`);
    await expect(page.getByRole('main')).toContainText(
      th ? 'ตะกร้ายังว่างอยู่' : 'Your cart is empty.',
    );
  });
  for (const route of [
    'looks',
    'vibes',
    'vibes/outdoor',
    'journal',
    'journal/everyday-layers',
    'journal/care-for-basics',
    'journal/one-set-many-days',
    'search',
    'checkout',
    'checkout/success',
  ]) {
    test(`content route ${route} ${locale} (FR-060, FR-061) @a11y`, async ({ page }) => {
      const response = await page.goto(`/${locale}/${route}`);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      const axe = await new AxeBuilder({ page }).analyze();
      expect(
        axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
      ).toEqual([]);
      if (route.startsWith('journal/'))
        await expect(page.getByRole('article').getByRole('heading', { level: 2 })).toHaveCount(3);
    });
  }
  test(`size guide switches measurement units ${locale} (FR-034, FR-035)`, async ({ page }) => {
    await page.goto(`/${locale}/products/essential-tee`);
    await page.getByText(th ? 'คู่มือไซซ์' : 'Size guide', { exact: true }).click();
    await page.getByRole('button', { name: th ? 'นิ้ว' : 'in', exact: true }).click();
    await expect(page.getByRole('table')).toContainText('36.2');
    await expect(
      page.getByRole('heading', { name: th ? 'ใส่คู่กันได้' : 'Goes well with' }),
    ).toBeVisible();
  });
  for (const currency of ['USD', 'THB']) {
    test(`look visual evidence ${locale} ${currency} (FR-040–042)`, async ({
      page,
      context,
    }, testInfo) => {
      await context.addCookies([
        { name: 'hc_currency', value: currency, url: 'http://localhost:3000' },
      ]);
      await page.goto(`/${locale}/looks/the-essential-look`);
      await expect(page.getByTestId('look-total')).toContainText(currency === 'USD' ? '$' : '฿');
      await page.screenshot({
        path: testInfo.outputPath(`look-${locale}-${currency}.png`),
        fullPage: true,
      });
    });
  }
}
