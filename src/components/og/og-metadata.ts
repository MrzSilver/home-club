import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { OG_SIZE } from '@/components/og/og-assets';
import type { Locale } from '@/data/schema';
import { absoluteUrl, type PageMetadata } from '@/lib/seo';

export type OgImageRef =
  | { kind: 'home' }
  | { kind: 'product'; slug: string; name: string }
  | { kind: 'article'; slug: string; title: string };

// The images are route handlers named *.png under /[locale]/og, so their public URLs carry no
// currency segment and end in a file extension, which the proxy leaves alone (docs/adr/0011).
function imagePath(locale: Locale, ref: OgImageRef): string {
  switch (ref.kind) {
    case 'home':
      return `/${locale}/og/home.png`;
    case 'product':
      return `/${locale}/og/products/${ref.slug}/image.png`;
    case 'article':
      return `/${locale}/og/journal/${ref.slug}/image.png`;
    default: {
      const unreachable: never = ref;
      throw new RangeError(`Unknown OG image ${JSON.stringify(unreachable)}`);
    }
  }
}

function imageName(ref: OgImageRef): string {
  switch (ref.kind) {
    case 'home':
      return '';
    case 'product':
      return ref.name;
    case 'article':
      return ref.title;
    default: {
      const unreachable: never = ref;
      throw new RangeError(`Unknown OG image ${JSON.stringify(unreachable)}`);
    }
  }
}

/**
 * Adds the Open Graph and Twitter image to a page's metadata. Next.js replaces a layout's `openGraph`
 * with the page's own, so a file-based `opengraph-image` above the page is dropped as soon as the page
 * sets `openGraph`; every page names its image explicitly instead.
 */
export async function withOgImage(
  metadata: PageMetadata,
  locale: Locale,
  ref: OgImageRef,
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'seo.og.alt' });
  const url = absoluteUrl(imagePath(locale, ref));
  const alt = t(ref.kind, { name: imageName(ref) });
  return {
    ...metadata,
    openGraph: { ...metadata.openGraph, images: [{ url, ...OG_SIZE, alt }] },
    twitter: { ...metadata.twitter, images: [{ url, ...OG_SIZE, alt }] },
  };
}
