import { expect, test } from '@playwright/test';

for (const locale of ['en', 'th'] as const) {
  test(`hover reveals the selected colour's back view: ${locale} (FR-022)`, async ({
    page,
    isMobile,
  }, testInfo) => {
    test.skip(isMobile, 'Hover is a desktop interaction; mobile uses the gallery thumbnails.');
    await page.goto(`/${locale}`);
    const card = page.locator('[data-product-card="essential-tee"]');
    await card.getByRole('button', { name: locale === 'en' ? 'Black' : 'ดำ', exact: true }).click();
    const back = card.locator('img').nth(1);
    await card.getByRole('link').hover();
    await expect(back).toHaveAttribute('src', /black-2/);
    await expect(back).toHaveJSProperty('complete', true);
    await expect(back).not.toHaveJSProperty('naturalWidth', 0);
    await expect(back).toHaveCSS('opacity', '1');
    await expect(back).toHaveCSS('transform', 'none');
    await card.screenshot({ path: testInfo.outputPath('back-on-hover.png') });
    await page.getByRole('heading', { level: 1 }).hover({ force: true });
    await expect(back).toHaveCSS('opacity', '0');
  });

  test(`gallery has front/back/side and changes all views with colour: ${locale} (FR-030)`, async ({
    page,
  }, testInfo) => {
    await page.goto(`/${locale}/products/essential-tee`);
    const gallery = page.getByRole('region', {
      name: locale === 'en' ? 'Product images' : 'ภาพสินค้า',
      exact: true,
    });
    const thumbnails = gallery.getByRole('button');
    await expect(thumbnails).toHaveCount(3);
    for (const [index, view] of (locale === 'en'
      ? ['Front', 'Back', 'Side']
      : ['ด้านหน้า', 'ด้านหลัง', 'ด้านข้าง']
    ).entries()) {
      const thumbnail = thumbnails.nth(index);
      await expect(thumbnail).toContainText(view);
      await expect(thumbnail).toHaveAccessibleName(view);
      await thumbnail.click();
      await expect(thumbnail).toHaveAttribute('aria-pressed', 'true');
      const track = gallery.getByRole('region');
      await expect
        .poll(() =>
          track.evaluate((element) => Math.round(element.scrollLeft / element.clientWidth)),
        )
        .toBe(index);
    }
    await expect(gallery).toContainText(locale === 'en' ? 'AI-generated previews' : 'สร้างด้วย AI');
    // Capturing an element taller than the viewport resizes Chromium and can re-snap the track.
    await page.screenshot({ path: testInfo.outputPath('side-view.png'), fullPage: false });
    await expect(thumbnails.nth(2)).toHaveAttribute('aria-pressed', 'true');
    await page
      .getByRole('group', { name: locale === 'en' ? 'Colour' : 'สี', exact: true })
      .getByRole('radio', { name: locale === 'en' ? 'Black' : 'ดำ', exact: true })
      .check();
    await expect(thumbnails.nth(0)).toHaveAttribute('aria-pressed', 'true');
    const frames = gallery.getByRole('region').locator('img');
    for (const index of [0, 1, 2])
      await expect(frames.nth(index)).toHaveAttribute('src', new RegExp(`black-${index + 1}`));
  });
}
