import { describe, expect, it } from 'vitest';

import { PRODUCTS } from '@/data/products';
import type { Product } from '@/data/schema';
import { convertFromUsdCents, toDecimalString, type Currency } from '@/lib/money';
import {
  BRAND_NAME,
  articleJsonLd,
  breadcrumbJsonLd,
  organizationJsonLd,
  productJsonLd,
  serializeJsonLd,
  webSiteJsonLd,
} from '@/lib/structured-data';

const SITE = 'https://homeclub.example';
const OPTIONS = { siteUrl: SITE };
const LOCALES = ['en', 'th'] as const;
const CURRENCIES: readonly Currency[] = ['USD', 'THB'];

// Every string value in a JSON-LD tree, so URL checks cover nested objects.
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (typeof value === 'object' && value !== null) return Object.values(value).flatMap(strings);
  return [];
}

// schema.org vocabulary URLs (@context, availability) are identifiers, not links to this site.
const SCHEMA_ORIGIN = 'https://schema.org';

const urlsIn = (value: unknown): string[] =>
  strings(value).filter((text) => /^https?:\/\//.test(text));

function firstProduct(): Product {
  const product = PRODUCTS[0];
  if (product === undefined) throw new Error('Seed catalogue is empty');
  return product;
}

const productCases = PRODUCTS.flatMap((product) =>
  LOCALES.flatMap((locale) =>
    CURRENCIES.map((currency) => [product.slug, locale, currency] as const),
  ),
);

describe('organizationJsonLd (FR-036)', () => {
  it('describes the fictional brand without address, contact, profiles or ratings', () => {
    expect(organizationJsonLd('en', undefined, OPTIONS)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: BRAND_NAME,
      url: `${SITE}/en`,
    });
  });

  it('carries the localised description it is given, Thai included', () => {
    const description = 'ร้านเสื้อผ้าตัวอย่าง ไม่มีการขายจริง';
    expect(organizationJsonLd('th', description, OPTIONS)).toMatchObject({
      url: `${SITE}/th`,
      description,
    });
  });
});

describe('webSiteJsonLd (FR-036)', () => {
  it('names the site and its language', () => {
    expect(webSiteJsonLd('th', 'คำอธิบาย', OPTIONS)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: BRAND_NAME,
      url: `${SITE}/th`,
      inLanguage: 'th',
      description: 'คำอธิบาย',
    });
  });

  it('omits the description when none is given', () => {
    expect(webSiteJsonLd('en', undefined, OPTIONS)).not.toHaveProperty('description');
  });
});

describe('productJsonLd (FR-036)', () => {
  it.each(productCases)(
    'builds a valid Product and Offer for %s in %s / %s',
    (slug, locale, currency) => {
      const product = PRODUCTS.find((candidate) => candidate.slug === slug);
      if (product === undefined) throw new Error(`Unknown seed product ${slug}`);
      const ld = productJsonLd(product, locale, currency, OPTIONS);
      expect(ld['@context']).toBe('https://schema.org');
      expect(ld['@type']).toBe('Product');
      expect(ld.name).toBe(product.name[locale]);
      expect(ld.description).toBe(product.description[locale]);
      expect(ld.url).toBe(`${SITE}/${locale}/products/${product.slug}`);
      expect(ld.image.length).toBeGreaterThan(0);
      expect(ld.offers['@type']).toBe('Offer');
      expect(ld.offers.priceCurrency).toBe(currency);
      expect(ld.offers.url).toBe(ld.url);
      expect(ld.offers.price).toBe(
        toDecimalString(convertFromUsdCents(product.priceCents, currency)),
      );
      expect(ld.offers.price).toMatch(/^\d+\.\d{2}$/);
      for (const url of urlsIn(ld).filter((link) => !link.startsWith(SCHEMA_ORIGIN))) {
        expect(url.startsWith(`${SITE}/`)).toBe(true);
        expect(url).not.toMatch(/\/(usd|thb)(\/|$)/);
      }
    },
  );

  it('builds a THB Offer price from integer cents via money.ts (FR-036)', () => {
    const product: Product = { ...firstProduct(), priceCents: 2900 };
    const thb = productJsonLd(product, 'en', 'THB', OPTIONS);
    expect(thb.offers.price).toBe(toDecimalString(convertFromUsdCents(2900, 'THB')));
    expect(thb.offers.price).toBe('1015.00');
    expect(productJsonLd(product, 'en', 'USD', OPTIONS).offers.price).toBe('29.00');
  });

  it('prices an odd cent amount exactly, with no float drift (RULES 7.1)', () => {
    const product: Product = { ...firstProduct(), priceCents: 1999 };
    expect(productJsonLd(product, 'en', 'USD', OPTIONS).offers.price).toBe('19.99');
  });

  it('reports InStock when any variant has stock', () => {
    const product = firstProduct();
    expect(product.variants.some((variant) => variant.stock > 0)).toBe(true);
    expect(productJsonLd(product, 'en', 'USD', OPTIONS).offers.availability).toBe(
      'https://schema.org/InStock',
    );
  });

  it('reports OutOfStock when every variant is sold out', () => {
    const product: Product = {
      ...firstProduct(),
      variants: firstProduct().variants.map((variant) => ({ ...variant, stock: 0 })),
    };
    expect(productJsonLd(product, 'en', 'USD', OPTIONS).offers.availability).toBe(
      'https://schema.org/OutOfStock',
    );
  });

  it('lists each image once as an absolute URL', () => {
    const product = firstProduct();
    const first = product.images[0];
    if (first === undefined) throw new Error('Seed product has no images');
    const doubled: Product = { ...product, images: [...product.images, first] };
    const { image } = productJsonLd(doubled, 'en', 'USD', OPTIONS);
    expect(new Set(image).size).toBe(image.length);
    expect(image).toContain(`${SITE}${first.src}`);
  });

  it('keeps Thai names and descriptions intact through serialisation', () => {
    const product = firstProduct();
    const ld = productJsonLd(product, 'th', 'THB', OPTIONS);
    expect(ld.name).toBe(product.name.th);
    expect(/[\u0E00-\u0E7F]/.test(ld.name)).toBe(true);
    expect(JSON.parse(serializeJsonLd(ld))).toEqual(ld);
  });

  it('makes no rating or review claims (RULES 1.3)', () => {
    const text = JSON.stringify(productJsonLd(firstProduct(), 'en', 'USD', OPTIONS));
    expect(text).not.toMatch(/aggregateRating|review/i);
  });
});

describe('breadcrumbJsonLd (FR-036)', () => {
  it('numbers items from 1 with absolute public URLs', () => {
    const ld = breadcrumbJsonLd(
      [
        { name: 'Home', path: '/en' },
        { name: 'Shop', path: '/en/shop' },
        { name: 'Essential Tee', path: '/en/products/essential-tee' },
      ],
      OPTIONS,
    );
    expect(ld['@type']).toBe('BreadcrumbList');
    expect(ld.itemListElement.map((item) => item.position)).toEqual([1, 2, 3]);
    expect(ld.itemListElement.map((item) => item.item)).toEqual([
      `${SITE}/en`,
      `${SITE}/en/shop`,
      `${SITE}/en/products/essential-tee`,
    ]);
  });

  it('refuses an empty trail and an internal path', () => {
    expect(() => breadcrumbJsonLd([], OPTIONS)).toThrow(RangeError);
    expect(() => breadcrumbJsonLd([{ name: 'Shop', path: '/en/usd/shop' }], OPTIONS)).toThrow(
      RangeError,
    );
  });
});

describe('articleJsonLd (FR-061, FR-036)', () => {
  const base = {
    slug: 'care-for-basics',
    locale: 'th',
    headline: 'ดูแลเสื้อผ้าพื้นฐานของคุณ',
    description: 'นิสัยเล็ก ๆ ระหว่างการสวมใส่',
  } as const;

  it('credits the brand as author and publisher and names the language', () => {
    expect(articleJsonLd(base, OPTIONS)).toMatchObject({
      '@type': 'Article',
      headline: base.headline,
      inLanguage: 'th',
      url: `${SITE}/th/journal/care-for-basics`,
      author: { '@type': 'Organization', name: BRAND_NAME },
      publisher: { '@type': 'Organization', name: BRAND_NAME },
    });
  });

  it('omits dates when the article has none, and includes them when it does', () => {
    expect(articleJsonLd(base, OPTIONS)).not.toHaveProperty('datePublished');
    expect(articleJsonLd(base, OPTIONS)).not.toHaveProperty('dateModified');
    expect(
      articleJsonLd({ ...base, datePublished: '2026-01-02', dateModified: '2026-02-03' }, OPTIONS),
    ).toMatchObject({ datePublished: '2026-01-02', dateModified: '2026-02-03' });
  });
});

describe('serializeJsonLd (SPEC 10, RULES 10.3)', () => {
  const hostile = '</script><script>alert(1)</script> & <!-- \u2028 \u2029 -->';
  const ld = organizationJsonLd('en', hostile, OPTIONS);

  it('never emits a literal </script> or any raw < > &', () => {
    const json = serializeJsonLd(ld);
    expect(json).not.toContain('</script>');
    expect(json).not.toMatch(/[<>&]/);
    expect(json).toContain('\\u003c/script\\u003e');
  });

  it('escapes U+2028 and U+2029', () => {
    const json = serializeJsonLd(ld);
    expect(json).not.toContain('\u2028');
    expect(json).not.toContain('\u2029');
    expect(json).toContain('\\u2028');
    expect(json).toContain('\\u2029');
  });

  it('round-trips: parsing the output returns the original value', () => {
    expect(JSON.parse(serializeJsonLd(ld))).toEqual(ld);
  });

  it('serialises an array of nodes', () => {
    const json = serializeJsonLd([ld, breadcrumbJsonLd([{ name: 'Home', path: '/en' }], OPTIONS)]);
    expect(JSON.parse(json)).toHaveLength(2);
  });
});
