import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';

// T07: text and controls over photography (DESIGN 5.3, 5.4, 9: "verify per image"). axe cannot judge
// text over a picture, so this measures it: the copy is hidden, the pixels that were behind it are
// screenshotted, and every pixel is compared with the text colour with the WCAG 2 formula. The
// numbers are the real rendered backdrop (picture + scrim + header scrim), at 375 and 1280 px.
const CANVAS = [247, 244, 239] as const; // --color-canvas
const SAND = [214, 191, 156] as const; // --color-sand (second headline line)
const LOCALES = ['en', 'th'] as const;
const SLIDES = 3;
const REQUIRED = 4.5;

type Rgb = readonly [number, number, number];
type Rect = { x: number; y: number; width: number; height: number };

const channel = (value: number): number => {
  const unit = value / 255;
  return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]: Rgb): number =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const ratio = (a: number, b: number): number => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

type Group = { selector: string; text: Rgb; alpha?: number };

/**
 * Hides every element matching one of `groups`, screenshots the text boxes each group had, and returns
 * the lowest contrast of that group's text colour (drawn at its alpha) over any pixel behind it. All
 * groups are hidden together, so neighbouring lines never leave glyphs in each other's boxes.
 */
async function worstContrast(page: Page, groups: Group[]): Promise<number[]> {
  const hide = groups.map((group) => group.selector).join(', ');
  const boxes = await Promise.all(groups.map((group) => page.evaluate(textRects, group.selector)));
  await page.evaluate((selector) => {
    for (const node of document.querySelectorAll(selector)) {
      (node as HTMLElement).style.visibility = 'hidden';
    }
  }, hide);
  const results: number[] = [];
  for (const [index, group] of groups.entries()) {
    const alpha = group.alpha ?? 1;
    let worst = Infinity;
    for (const box of boxes[index] ?? []) {
      const clip = {
        x: Math.max(0, Math.floor(box.x)),
        y: Math.max(0, Math.floor(box.y)),
        width: Math.ceil(box.width),
        height: Math.ceil(box.height),
      };
      const { data, info } = await sharp(await page.screenshot({ clip }))
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      for (let offset = 0; offset < data.length; offset += info.channels) {
        const back: Rgb = [data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0];
        const mixed = group.text.map(
          (value, channelIndex) => value * alpha + (back[channelIndex] ?? 0) * (1 - alpha),
        ) as unknown as Rgb;
        worst = Math.min(worst, ratio(luminance(mixed), luminance(back)));
      }
    }
    results.push(worst);
  }
  await page.evaluate((selector) => {
    for (const node of document.querySelectorAll(selector)) {
      (node as HTMLElement).style.visibility = '';
    }
  }, hide);
  return results;
}

/** Tight line boxes of the text inside the matching elements (not their full-width blocks). */
function textRects(selector: string): Rect[] {
  const rects: Rect[] = [];
  for (const node of document.querySelectorAll(selector)) {
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const r of range.getClientRects()) {
      rects.push({ x: r.x, y: r.y, width: r.width, height: r.height });
    }
  }
  return rects;
}

async function showSlide(page: Page, n: number): Promise<void> {
  await page.locator('[aria-roledescription="carousel"] button[aria-label]').nth(n).click();
  await expect(page.locator('.hero-slide[data-active]')).toHaveAttribute(
    'aria-label',
    new RegExp(`^(Slide )?${n + 1}|^${n + 1}`),
  );
  // Fade finished: every other slide is gone and the new one is opaque.
  await page.waitForTimeout(700);
}

for (const locale of LOCALES) {
  test.describe(`/${locale}`, () => {
    test(`hero headline and header are readable on every slide (>= ${REQUIRED}:1, worst pixel)`, async ({
      page,
    }, testInfo) => {
      await page.goto(`/${locale}`);
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => document.fonts.ready);
      const report: string[] = [];

      for (let n = 0; n < SLIDES; n += 1) {
        await showSlide(page, n);
        const [first = 0, second = 0] = await worstContrast(page, [
          {
            selector:
              '.hero-slide[data-active] h1 > span:first-child, .hero-slide[data-active] p > span:first-child',
            text: CANVAS,
          },
          {
            selector:
              '.hero-slide[data-active] h1 > span:last-child, .hero-slide[data-active] p > span:last-child',
            text: SAND,
          },
        ]);
        const [header = 0] = await worstContrast(page, [
          { selector: 'header a, header button', text: CANVAS },
        ]);
        report.push(
          `slide ${n + 1}: line1 ${first.toFixed(2)}, line2 ${second.toFixed(2)}, wordmark ${header.toFixed(2)}`,
        );
        expect.soft(first, `slide ${n + 1} first line`).toBeGreaterThanOrEqual(REQUIRED);
        expect.soft(second, `slide ${n + 1} second line`).toBeGreaterThanOrEqual(REQUIRED);
        expect.soft(header, `slide ${n + 1} wordmark`).toBeGreaterThanOrEqual(REQUIRED);
      }
      testInfo.annotations.push({ type: 'contrast', description: report.join(' | ') });
    });

    test(`category tile copy is readable on its picture (>= ${REQUIRED}:1, worst pixel)`, async ({
      page,
    }, testInfo) => {
      await page.goto(`/${locale}`);
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => document.fonts.ready);
      const report: string[] = [];

      for (let n = 0; n < 4; n += 1) {
        const tile = page.locator('#categories-heading ~ div a').nth(n);
        await tile.scrollIntoViewIfNeeded();
        await page.waitForTimeout(200);
        const marker = `tile-${n}`;
        await tile.evaluate((node, id) => node.setAttribute('data-probe', id), marker);
        const [title = 0, subtitle = 0] = await worstContrast(page, [
          { selector: `[data-probe="${marker}"] h3`, text: CANVAS },
          { selector: `[data-probe="${marker}"] p`, text: CANVAS, alpha: 0.85 },
        ]);
        report.push(`tile ${n + 1}: title ${title.toFixed(2)}, subtitle ${subtitle.toFixed(2)}`);
        expect.soft(title, `tile ${n + 1} title`).toBeGreaterThanOrEqual(REQUIRED);
        expect.soft(subtitle, `tile ${n + 1} subtitle`).toBeGreaterThanOrEqual(REQUIRED);
      }
      testInfo.annotations.push({ type: 'contrast', description: report.join(' | ') });
    });
  });
}
