import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

for (const locale of ['en', 'th'] as const) {
  const th = locale === 'th';
  test(`Journey 2: complete look survives reload and loses its discount after removal ${locale} (FR-040, FR-042, FR-052) @a11y`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/looks/the-essential-look`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      th ? 'ลุคพื้นฐาน' : 'The Essential Look',
    );
    await expect(page.getByRole('group')).toHaveCount(4);
    await expect(page.getByTestId('look-total')).toContainText(th ? '฿' : '$');
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious'),
    ).toEqual([]);
    await page
      .getByRole('button', { name: th ? 'เพิ่มทั้งลุคลงตะกร้า' : 'Add the look', exact: true })
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.goto(`/${locale}/cart`);
    await expect(
      page.getByText(th ? /ลุคพื้นฐาน: ประหยัด/ : /The Essential Look: you save/),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByText(th ? /ลุคพื้นฐาน: ประหยัด/ : /The Essential Look: you save/),
    ).toBeVisible();
    await page
      .getByRole('button', { name: th ? /นำ.*ออก/ : /Remove/ })
      .first()
      .click();
    await expect(
      page.getByText(
        th
          ? 'ไม่ได้รับส่วนลดทั้งชุด ต้องมีสินค้าครบทั้งสี่ชิ้น'
          : 'Set discount removed: all four pieces are needed.',
      ),
    ).toBeVisible();
  });
  test(`Journey 4: unavailable look adds nothing and offers an alternative ${locale} (FR-041, FR-043)`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/looks/the-essential-look`);
    const top = page.getByRole('group', { name: th ? 'เสื้อ' : 'Top', exact: true });
    await top
      .getByRole('combobox', { name: th ? 'ไซซ์' : 'Size', exact: true })
      .selectOption('XXL');
    await page
      .getByRole('button', { name: th ? 'เพิ่มทั้งลุคลงตะกร้า' : 'Add the look', exact: true })
      .click();
    await expect(page.getByRole('main').getByRole('alert')).toBeFocused();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('hc:cart:v1'))).toBeNull();
    await expect(
      top.getByText(th ? 'เลือกตัวเลือกที่มีสินค้า' : 'Try an available alternative'),
    ).toBeVisible();
    await top.getByRole('button').first().click();
    await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
  });
}
