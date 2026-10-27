import { z } from 'zod';
import { CATEGORY_ENTRIES } from '@/data/categories';
import { FEATURED_ESSENTIAL_IDS, PRODUCTS } from '@/data/products';
import {
  CATEGORIES,
  SIZES,
  categorySchema,
  sizeSchema,
  type Category,
  type CategoryEntry,
  type Color,
  type Product,
  type Size,
  type Variant,
} from '@/data/schema';
import { currencyToSegment, segmentToCurrency } from '@/lib/currency';
import {
  ceilToWholeUnits,
  convertFromUsdCents,
  convertWholeUnits,
  floorToWholeUnits,
  wholeUnitsToMinor,
  type Currency,
} from '@/lib/money';
import { isInStock } from '@/lib/stock';

// ---------------------------------------------------------------------------------------------
// Lookups over the seed data
// ---------------------------------------------------------------------------------------------

const productsBySlug = new Map(PRODUCTS.map((product) => [product.slug, product]));

const productsById = new Map(PRODUCTS.map((product) => [product.id, product]));

export interface SkuMatch {
  product: Product;
  variant: Variant;
}

const variantsBySku = new Map<string, SkuMatch>(
  PRODUCTS.flatMap((product) =>
    product.variants.map((variant): [string, SkuMatch] => [variant.sku, { product, variant }]),
  ),
);

const featuredEssentials: readonly Product[] = FEATURED_ESSENTIAL_IDS.map((id) => {
  const product = productsById.get(id);
  // Fail fast at module load, like the schema parse, so a bad featured id breaks the build.
  if (product === undefined) throw new Error(`Seed error: featured product "${id}" does not exist`);
  return product;
});

// Colour ids that exist in the catalogue; URL colour values outside this set are dropped.
const knownColorIds: ReadonlySet<string> = new Set(
  PRODUCTS.flatMap((product) => product.colors.map((color) => color.id)),
);

export function getAllProducts(): readonly Product[] {
  return PRODUCTS;
}

export function getProductBySlug(slug: string): Product | undefined {
  return productsBySlug.get(slug);
}

export function getProductsByCategory(category: Category): Product[] {
  return PRODUCTS.filter((product) => product.category === category);
}

/** The four products of the Home "Essentials" grid (FR-012), in display order. */
export function getFeaturedEssentials(): readonly Product[] {
  return featuredEssentials;
}

export function getAllCategories(): readonly CategoryEntry[] {
  return CATEGORY_ENTRIES;
}

/** Category by id; accepts any string because route params are untrusted. */
export function getCategory(id: string): CategoryEntry | undefined {
  return CATEGORY_ENTRIES.find((entry) => entry.id === id);
}

export function findVariantBySku(sku: string): SkuMatch | undefined {
  return variantsBySku.get(sku);
}

// ---------------------------------------------------------------------------------------------
// URL query state (FR-021, SPEC 7.3)
//
// Price bounds are whole units (dollars or baht). The public URL never carries the currency route
// segment, so the unit travels in the query: `serializeCatalogueQuery` writes `priceCurrency=usd|thb`
// next to any bound, and `parseCatalogueQuery` converts tagged bounds into the ACTIVE currency (min
// rounds down, max rounds up, so a switch never hides a product the range showed). A bound without
// the tag is read as the active currency. A parsed query therefore always holds active-currency units,
// and a shared link, a locale switch or a currency switch needs no extra step from the caller.
// ---------------------------------------------------------------------------------------------

export const SORTS = ['featured', 'price-asc', 'price-desc', 'newest'] as const;
export type CatalogueSort = (typeof SORTS)[number];
export const DEFAULT_SORT: CatalogueSort = 'featured';

const sortSchema = z.enum(SORTS);
// Upper bound for a price in the URL, in whole units of the currency it is tagged with (about 100,000
// USD at the fixed demo rate). Anything larger is not a real filter value and is dropped. The two caps
// convert into each other exactly, so a converted bound can never exceed the active currency's cap.
const MAX_PRICE_UNITS: Readonly<Record<Currency, number>> = { USD: 100_000, THB: 3_500_000 };
const colorIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const catalogueQuerySchema = z.strictObject({
  category: categorySchema.optional(),
  color: z.array(colorIdSchema),
  size: z.array(sizeSchema),
  minPrice: z.int().min(0).max(MAX_PRICE_UNITS.THB).optional(),
  maxPrice: z.int().min(0).max(MAX_PRICE_UNITS.THB).optional(),
  sort: sortSchema,
});

export type CatalogueQuery = z.infer<typeof catalogueQuerySchema>;

export const DEFAULT_CATALOGUE_QUERY: CatalogueQuery = { color: [], size: [], sort: DEFAULT_SORT };

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

// A param can repeat (?color=a&color=b) or be comma-separated (?color=a,b); both are accepted.
const tokensOf = (raw: string | string[] | undefined): string[] =>
  (raw === undefined ? [] : Array.isArray(raw) ? raw : [raw])
    .flatMap((value) => value.split(','))
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

const sizeRank = (size: Size): number => SIZES.indexOf(size);

const uniqueSorted = <T>(values: readonly T[], compare: (a: T, b: T) => number): T[] =>
  [...new Set(values)].sort(compare);

const compareText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

const parseSort = (raw: string | string[] | undefined): CatalogueSort => {
  const parsed = sortSchema.safeParse(tokensOf(raw)[0]);
  return parsed.success ? parsed.data : DEFAULT_SORT;
};

const parseCategory = (raw: string | string[] | undefined): Category | undefined => {
  const parsed = categorySchema.safeParse(tokensOf(raw)[0]);
  return parsed.success ? parsed.data : undefined;
};

// Digits only, no larger than the cap of the currency the figure is written in.
const parseWholePrice = (
  raw: string | string[] | undefined,
  writtenIn: Currency,
): number | undefined => {
  const token = tokensOf(raw)[0];
  if (token === undefined || !/^\d+$/.test(token)) return undefined;
  const value = Number(token);
  return Number.isSafeInteger(value) && value <= MAX_PRICE_UNITS[writtenIn] ? value : undefined;
};

// The `priceCurrency` tag; a missing or unreadable tag means the active currency.
const parsePriceCurrency = (raw: string | string[] | undefined, active: Currency): Currency =>
  segmentToCurrency(tokensOf(raw)[0]?.toLowerCase()) ?? active;

/**
 * Parses untrusted URL params into a normalised query and never throws: unknown or malformed values
 * fall back to defaults (SPEC 7.3). Colours (matched case-insensitively, like sizes) are validated
 * against the catalogue, both lists are de-duplicated and put in canonical order, and a price range
 * with min > max is discarded. `currency` is the active currency; price bounds tagged with the other
 * currency (`priceCurrency`) are converted into it, rounding the minimum down and the maximum up.
 */
export function parseCatalogueQuery(
  searchParams: SearchParamsRecord,
  currency: Currency,
): CatalogueQuery {
  const category = parseCategory(searchParams['category']);
  const color = uniqueSorted(
    tokensOf(searchParams['color'])
      .map((token) => token.toLowerCase())
      .filter((id) => knownColorIds.has(id)),
    compareText,
  );
  const size = uniqueSorted(
    tokensOf(searchParams['size']).flatMap((token) => {
      const parsed = sizeSchema.safeParse(token.toUpperCase());
      return parsed.success ? [parsed.data] : [];
    }),
    (a, b) => sizeRank(a) - sizeRank(b),
  );
  const writtenIn = parsePriceCurrency(searchParams['priceCurrency'], currency);
  const rawMin = parseWholePrice(searchParams['minPrice'], writtenIn);
  const rawMax = parseWholePrice(searchParams['maxPrice'], writtenIn);
  let minPrice =
    rawMin === undefined ? undefined : convertWholeUnits(rawMin, writtenIn, currency, 'down');
  let maxPrice =
    rawMax === undefined ? undefined : convertWholeUnits(rawMax, writtenIn, currency, 'up');
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    minPrice = undefined;
    maxPrice = undefined;
  }
  return {
    ...(category === undefined ? {} : { category }),
    color,
    size,
    ...(minPrice === undefined ? {} : { minPrice }),
    ...(maxPrice === undefined ? {} : { maxPrice }),
    sort: parseSort(searchParams['sort']),
  };
}

/** Same as `parseCatalogueQuery`, for a raw query string or `URLSearchParams`. */
export function parseCatalogueSearch(
  search: string | URLSearchParams,
  currency: Currency,
): CatalogueQuery {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  // A Map keeps hostile keys such as "__proto__" from touching an object prototype.
  const grouped = new Map<string, string[]>();
  for (const [key, value] of params) {
    grouped.set(key, [...(grouped.get(key) ?? []), value]);
  }
  return parseCatalogueQuery(Object.fromEntries(grouped), currency);
}

/**
 * Query string (without "?") with a stable key order and canonical value order; defaults are omitted
 * so the default view has the clean URL. `currency` is the currency the price bounds are written in;
 * it is added as `priceCurrency` whenever a bound is present so the link means the same thing to every
 * viewer. `parseCatalogueQuery` of the result, with the same currency, gives back the query.
 */
export function serializeCatalogueQuery(query: CatalogueQuery, currency: Currency): string {
  const color = uniqueSorted(query.color, compareText);
  const size = uniqueSorted(query.size, (a, b) => sizeRank(a) - sizeRank(b));
  const pairs: [string, string][] = [];
  if (query.category !== undefined) pairs.push(['category', query.category]);
  if (color.length > 0) pairs.push(['color', color.map(encodeURIComponent).join(',')]);
  if (size.length > 0) pairs.push(['size', size.map(encodeURIComponent).join(',')]);
  if (query.minPrice !== undefined) pairs.push(['minPrice', String(query.minPrice)]);
  if (query.maxPrice !== undefined) pairs.push(['maxPrice', String(query.maxPrice)]);
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    pairs.push(['priceCurrency', currencyToSegment(currency)]);
  }
  if (query.sort !== DEFAULT_SORT) pairs.push(['sort', query.sort]);
  return pairs.map(([key, value]) => `${key}=${value}`).join('&');
}

// ---------------------------------------------------------------------------------------------
// Filtering, sorting, facets
// ---------------------------------------------------------------------------------------------

/**
 * Filters a product list (FR-021). Category is exact. Colour and size (OR within each group, AND
 * across groups) match IN-STOCK variants only: a product qualifies when one variant satisfies every
 * chosen colour and size at once, so "grey + M" never returns a product whose grey is sold out in
 * M. Price bounds are inclusive whole units of `currency`, compared on the converted price.
 */
export function filterProducts(
  products: readonly Product[],
  query: CatalogueQuery,
  currency: Currency,
): Product[] {
  const min = query.minPrice === undefined ? undefined : wholeUnitsToMinor(query.minPrice);
  const max = query.maxPrice === undefined ? undefined : wholeUnitsToMinor(query.maxPrice);
  return products.filter((product) => {
    if (query.category !== undefined && product.category !== query.category) return false;
    const price = convertFromUsdCents(product.priceCents, currency);
    if (min !== undefined && price < min) return false;
    if (max !== undefined && price > max) return false;
    if (query.color.length === 0 && query.size.length === 0) return true;
    return product.variants.some(
      (variant) =>
        isInStock(variant) &&
        (query.color.length === 0 || query.color.includes(variant.colorId)) &&
        (query.size.length === 0 || query.size.includes(variant.size)),
    );
  });
}

/** Returns a new array. `featured` keeps data order; ties keep their input order (stable sort). */
export function sortProducts(products: readonly Product[], sort: CatalogueSort): Product[] {
  const sorted = [...products];
  switch (sort) {
    case 'featured':
      return sorted;
    case 'price-asc':
      return sorted.sort((a, b) => a.priceCents - b.priceCents);
    case 'price-desc':
      return sorted.sort((a, b) => b.priceCents - a.priceCents);
    case 'newest':
      return sorted.sort((a, b) => compareText(b.createdAt, a.createdAt));
    default: {
      const unreachable: never = sort;
      return unreachable;
    }
  }
}

export interface CatalogueFacets {
  categories: Category[];
  colors: Color[];
  sizes: Size[];
  // Whole units of the active currency, rounded outwards; null for an empty list.
  priceRange: { min: number; max: number } | null;
}

const colorsById: ReadonlyMap<string, Color> = new Map(
  PRODUCTS.flatMap((product) => product.colors.map((color): [string, Color] => [color.id, color])),
);

/**
 * What the filter UI can offer for a product list: colours and sizes that have at least one in-stock
 * variant (first-seen order for colours, canonical order for sizes) and the price range in whole
 * units of `currency`.
 *
 * Contract for the Filters UI: pass the parsed query as `selected`. Values the visitor has already
 * chosen are always included, even when no product in the list has them in stock (for example
 * `category=lifestyle&color=white`), so the active filter always has a control to remove it. Without
 * `selected` only options with stock are returned.
 */
export function getFacets(
  products: readonly Product[],
  currency: Currency,
  selected: Pick<CatalogueQuery, 'color' | 'size'> = { color: [], size: [] },
): CatalogueFacets {
  const colors = new Map<string, Color>();
  const sizes = new Set<Size>(selected.size);
  const categories = new Set<Category>();
  let min = Number.POSITIVE_INFINITY;
  let max = 0;
  for (const product of products) {
    categories.add(product.category);
    const price = convertFromUsdCents(product.priceCents, currency);
    min = Math.min(min, price);
    max = Math.max(max, price);
    for (const variant of product.variants) {
      if (!isInStock(variant)) continue;
      sizes.add(variant.size);
      const color = product.colors.find((candidate) => candidate.id === variant.colorId);
      if (color !== undefined && !colors.has(color.id)) colors.set(color.id, color);
    }
  }
  for (const id of selected.color) {
    const color = colorsById.get(id);
    if (color !== undefined && !colors.has(id)) colors.set(id, color);
  }
  return {
    categories: CATEGORIES.filter((category) => categories.has(category)),
    colors: [...colors.values()],
    sizes: [...sizes].sort((a, b) => sizeRank(a) - sizeRank(b)),
    priceRange:
      products.length === 0 ? null : { min: floorToWholeUnits(min), max: ceilToWholeUnits(max) },
  };
}
