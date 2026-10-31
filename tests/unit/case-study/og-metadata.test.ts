import { describe, expect, it, vi } from 'vitest';

import { OG_SIZE } from '@/components/og/og-assets';
import { withOgImage } from '@/components/og/og-metadata';
import { pageMetadata } from '@/lib/seo';
import en from '@messages/en.json';
import th from '@messages/th.json';

vi.mock(
  'next-intl/server',
  async () => (await import('../helpers/intl-server-mock')).serverIntlModule,
);

const base = (locale: 'en' | 'th'): ReturnType<typeof pageMetadata> =>
  pageMetadata({ locale, path: '/shop', title: 'Shop', description: 'All products' });

type Image = { url: string; width: number; height: number; alt: string };

const imageOf = (value: unknown): Image => {
  const [first] = value as Image[];
  if (!first) throw new Error('no image');
  return first;
};

describe('withOgImage (FR-071)', () => {
  it('uses the default card for the home kind, with the card size and alt', async () => {
    const result = await withOgImage(base('en'), 'en', { kind: 'home' });
    const image = imageOf((result.openGraph as { images: unknown }).images);
    expect(image.url).toMatch(/\/en\/og\/home\.png$/);
    expect(image.width).toBe(OG_SIZE.width);
    expect(image.height).toBe(OG_SIZE.height);
    expect(image.alt).toBe(en.seo.og.alt.home);
  });

  it('builds a product image URL from the slug and puts the product name in the alt', async () => {
    const result = await withOgImage(base('en'), 'en', {
      kind: 'product',
      slug: 'essential-tee',
      name: 'Essential Tee',
    });
    const image = imageOf((result.openGraph as { images: unknown }).images);
    expect(image.url).toMatch(/\/en\/og\/products\/essential-tee\/image\.png$/);
    expect(image.alt).toBe('Essential Tee, a product from Home Club Foundation');
  });

  it('builds an article image URL in Thai with the Thai alt template', async () => {
    const result = await withOgImage(base('th'), 'th', {
      kind: 'article',
      slug: 'quiet-wardrobe',
      title: 'ตู้เสื้อผ้า',
    });
    const image = imageOf((result.openGraph as { images: unknown }).images);
    expect(image.url).toMatch(/\/th\/og\/journal\/quiet-wardrobe\/image\.png$/);
    expect(image.alt).toBe(th.seo.og.alt.article.replace('{name}', 'ตู้เสื้อผ้า'));
  });

  it('never leaks the currency segment into the image URL', async () => {
    const result = await withOgImage(base('en'), 'en', { kind: 'home' });
    expect(JSON.stringify(result)).not.toMatch(/\/(usd|thb)\//);
  });

  it('mirrors the image on twitter and keeps the page metadata', async () => {
    const source = base('en');
    const result = await withOgImage(source, 'en', { kind: 'home' });
    expect((result.twitter as { images: unknown }).images).toEqual(
      (result.openGraph as { images: unknown }).images,
    );
    expect(result.title).toBe(source.title);
    expect(result.alternates).toEqual(source.alternates);
    expect((result.openGraph as { url?: string }).url).toBe(source.openGraph?.url);
  });
});
