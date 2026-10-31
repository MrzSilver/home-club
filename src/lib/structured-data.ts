import type { Locale, Product } from '@/data/schema';
import { publicPath } from '@/lib/locale-path';
import { convertFromUsdCents, toDecimalString, type Currency } from '@/lib/money';
import { absoluteUrl } from '@/lib/seo';
import { isSoldOut } from '@/lib/stock';

// schema.org JSON-LD as plain typed objects (SPEC 10, FR-036). Nothing here is invented: the brand is
// a fictional demo, so there is no address, phone number, social profile, rating or review (RULES 1.3).

export const SCHEMA_CONTEXT = 'https://schema.org';

/** Brand name for structured data; mirrors `common.brandName` in the message catalogues. */
export const BRAND_NAME = 'Home Club Foundation';

/** `siteUrl` overrides `NEXT_PUBLIC_SITE_URL`; tests use it, pages leave it out. */
export type UrlOptions = { siteUrl?: string };

export type OrganizationRef = { '@type': 'Organization'; name: string; url: string };

export type OrganizationJsonLd = OrganizationRef & {
  '@context': typeof SCHEMA_CONTEXT;
  description?: string;
};

export type WebSiteJsonLd = {
  '@context': typeof SCHEMA_CONTEXT;
  '@type': 'WebSite';
  name: string;
  url: string;
  inLanguage: Locale;
  description?: string;
};

export type OfferJsonLd = {
  '@type': 'Offer';
  url: string;
  /** Decimal string such as "29.00"; THB is whole baht. */
  price: string;
  priceCurrency: Currency;
  availability: 'https://schema.org/InStock' | 'https://schema.org/OutOfStock';
};

export type ProductJsonLd = {
  '@context': typeof SCHEMA_CONTEXT;
  '@type': 'Product';
  name: string;
  description: string;
  sku: string;
  url: string;
  image: string[];
  brand: { '@type': 'Brand'; name: string };
  offers: OfferJsonLd;
};

export type BreadcrumbJsonLd = {
  '@context': typeof SCHEMA_CONTEXT;
  '@type': 'BreadcrumbList';
  itemListElement: {
    '@type': 'ListItem';
    position: number;
    name: string;
    item: string;
  }[];
};

export type ArticleJsonLd = {
  '@context': typeof SCHEMA_CONTEXT;
  '@type': 'Article';
  headline: string;
  description: string;
  url: string;
  inLanguage: Locale;
  author: OrganizationRef;
  publisher: OrganizationRef;
  datePublished?: string;
  dateModified?: string;
};

export type JsonLd =
  OrganizationJsonLd | WebSiteJsonLd | ProductJsonLd | BreadcrumbJsonLd | ArticleJsonLd;

function brandRef(locale: Locale, options: UrlOptions): OrganizationRef {
  return {
    '@type': 'Organization',
    name: BRAND_NAME,
    url: absoluteUrl(publicPath(locale), options.siteUrl),
  };
}

/** `description` is the localised site description from the `seo` messages; omitted when not given. */
export function organizationJsonLd(
  locale: Locale,
  description?: string,
  options: UrlOptions = {},
): OrganizationJsonLd {
  return {
    '@context': SCHEMA_CONTEXT,
    ...brandRef(locale, options),
    ...(description === undefined ? {} : { description }),
  };
}

export function webSiteJsonLd(
  locale: Locale,
  description?: string,
  options: UrlOptions = {},
): WebSiteJsonLd {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'WebSite',
    name: BRAND_NAME,
    url: absoluteUrl(publicPath(locale), options.siteUrl),
    inLanguage: locale,
    ...(description === undefined ? {} : { description }),
  };
}

/**
 * Product with one Offer in the page's currency (FR-036). The price is the catalogue USD cents
 * converted by `lib/money.ts` and written as an exact decimal string; availability is "in stock" when
 * any variant has stock. `currency` comes from the route segment, never from a cookie.
 */
export function productJsonLd(
  product: Product,
  locale: Locale,
  currency: Currency,
  options: UrlOptions = {},
): ProductJsonLd {
  const url = absoluteUrl(publicPath(locale, `/products/${product.slug}`), options.siteUrl);
  const images = [...new Set(product.images.map((image) => image.src))];
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Product',
    name: product.name[locale],
    description: product.description[locale],
    sku: product.id,
    url,
    image: images.map((src) => absoluteUrl(src, options.siteUrl)),
    brand: { '@type': 'Brand', name: BRAND_NAME },
    offers: {
      '@type': 'Offer',
      url,
      price: toDecimalString(convertFromUsdCents(product.priceCents, currency)),
      priceCurrency: currency,
      availability: isSoldOut(product)
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
    },
  };
}

export type Crumb = {
  name: string;
  /** Public path ("/en/shop"). */
  path: string;
};

/** Ordered trail, root first. Positions start at 1 as schema.org requires. */
export function breadcrumbJsonLd(
  crumbs: readonly Crumb[],
  options: UrlOptions = {},
): BreadcrumbJsonLd {
  if (crumbs.length === 0) throw new RangeError('A breadcrumb needs at least one item');
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path, options.siteUrl),
    })),
  };
}

export type ArticleInput = {
  slug: string;
  locale: Locale;
  headline: string;
  description: string;
  /** ISO dates, only when the article's frontmatter has them (none are invented). */
  datePublished?: string;
  dateModified?: string;
};

export function articleJsonLd(input: ArticleInput, options: UrlOptions = {}): ArticleJsonLd {
  const brand = brandRef(input.locale, options);
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    url: absoluteUrl(publicPath(input.locale, `/journal/${input.slug}`), options.siteUrl),
    inLanguage: input.locale,
    author: brand,
    publisher: brand,
    ...(input.datePublished === undefined ? {} : { datePublished: input.datePublished }),
    ...(input.dateModified === undefined ? {} : { dateModified: input.dateModified }),
  };
}

// `<` and `>` keep "</script>" and "<!--" from ending the script element; `&` guards HTML entity
// parsing in older embeddings; U+2028/2029 were line terminators in JavaScript string literals before
// ES2019 and still break some parsers. Each becomes a JSON escape, so the parsed value is unchanged.
const UNSAFE_IN_SCRIPT = /[<>&\u{2028}\u{2029}]/gu;

/** JSON for a `<script type="application/ld+json">` body; safe to inject without further escaping. */
export function serializeJsonLd(value: JsonLd | readonly JsonLd[]): string {
  return JSON.stringify(value).replace(
    UNSAFE_IN_SCRIPT,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
}
