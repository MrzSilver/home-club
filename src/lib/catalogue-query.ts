import { CATEGORIES, SIZES } from '@/data/taxonomy';
import type { Category, Color, Product, Size } from '@/data/schema';
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
// Catalogue query: URL state, filtering, sorting and facets (FR-021, SPEC 7.3).
//
// This module is deliberately free of the seed data and of Zod: the collection page ships it to the
// browser, where it filters a short list of items the server hands over (ADR-0006). The seed-bound
// entry points (`parseCatalogueQuery`, `getFacets`, ...) live in `catalogue.ts` and delegate here.
// The Zod schema of the parsed shape is in `catalogue.ts` too, and a test checks every parse result
// against it, so the two cannot drift.
//
// Price bounds are whole units (dollars or baht). The public URL never carries the currency route
// segment, so the unit travels in the query: `serializeCatalogueQuery` writes `priceCurrency=usd|thb`
// next to any bound, and the parser converts tagged bounds into the ACTIVE currency (min rounds
// down, max rounds up, so a switch never hides a product the range showed). A bound without the tag
// is read as the active currency. A parsed query therefore always holds active-currency units, and a
// shared link, a locale switch or a currency switch needs no extra step from the caller.
// ---------------------------------------------------------------------------------------------

export const SORTS = ['featured', 'price-asc', 'price-desc', 'newest'] as const;
export type CatalogueSort = (typeof SORTS)[number];
export const DEFAULT_SORT: CatalogueSort = 'featured';

/** Upper bound for a price in the URL, in whole units of the currency it is tagged with (about 100,000
 * USD at the fixed demo rate). Anything larger is not a real filter value and is dropped. The two caps
 * convert into each other exactly, so a converted bound can never exceed the active currency's cap. */
export const MAX_PRICE_UNITS: Readonly<Record<Currency, number>> = {
  USD: 100_000,
  THB: 3_500_000,
};

export interface CatalogueQuery {
  category?: Category | undefined;
  color: string[];
  size: Size[];
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  sort: CatalogueSort;
}

export const DEFAULT_CATALOGUE_QUERY: CatalogueQuery = { color: [], size: [], sort: DEFAULT_SORT };

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

const isOneOf = <T extends string>(list: readonly T[], value: string | undefined): value is T =>
  value !== undefined && (list as readonly string[]).includes(value);

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
  const token = tokensOf(raw)[0];
  return isOneOf(SORTS, token) ? token : DEFAULT_SORT;
};

const parseCategory = (raw: string | string[] | undefined): Category | undefined => {
  const token = tokensOf(raw)[0];
  return isOneOf(CATEGORIES, token) ? token : undefined;
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
 * against `knownColorIds`, both lists are de-duplicated and put in canonical order, and a price range
 * with min > max is discarded. `currency` is the active currency; price bounds tagged with the other
 * currency (`priceCurrency`) are converted into it, rounding the minimum down and the maximum up.
 */
export function parseQueryParams(
  searchParams: SearchParamsRecord,
  currency: Currency,
  knownColorIds: ReadonlySet<string>,
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
      const upper = token.toUpperCase();
      return isOneOf(SIZES, upper) ? [upper] : [];
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

/** Same as `parseQueryParams`, for a raw query string or `URLSearchParams`. */
export function parseQuerySearch(
  search: string | URLSearchParams,
  currency: Currency,
  knownColorIds: ReadonlySet<string>,
): CatalogueQuery {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  // A Map keeps hostile keys such as "__proto__" from touching an object prototype.
  const grouped = new Map<string, string[]>();
  for (const [key, value] of params) {
    grouped.set(key, [...(grouped.get(key) ?? []), value]);
  }
  return parseQueryParams(Object.fromEntries(grouped), currency, knownColorIds);
}

/**
 * Query string (without "?") with a stable key order and canonical value order; defaults are omitted
 * so the default view has the clean URL. `currency` is the currency the price bounds are written in;
 * it is added as `priceCurrency` whenever a bound is present so the link means the same thing to every
 * viewer. Parsing the result with the same currency gives back the query.
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
// Changing a query (the filter UI's vocabulary). Each returns a new query; none mutates.
// ---------------------------------------------------------------------------------------------

const toggled = <T>(list: readonly T[], value: T): T[] =>
  list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];

export function toggleColor(query: CatalogueQuery, colorId: string): CatalogueQuery {
  return { ...query, color: toggled(query.color, colorId) };
}

export function toggleSize(query: CatalogueQuery, size: Size): CatalogueQuery {
  return { ...query, size: toggled(query.size, size) };
}

export function withCategory(
  query: CatalogueQuery,
  category: Category | undefined,
): CatalogueQuery {
  return { ...query, category };
}

/** Sets or clears (undefined) each bound. Passing `null` for a bound leaves it as it is. */
export function withPriceBounds(
  query: CatalogueQuery,
  bounds: { min?: number | undefined | null; max?: number | undefined | null },
): CatalogueQuery {
  return {
    ...query,
    minPrice: bounds.min === null ? query.minPrice : bounds.min,
    maxPrice: bounds.max === null ? query.maxPrice : bounds.max,
  };
}

export function withSort(query: CatalogueQuery, sort: CatalogueSort): CatalogueQuery {
  return { ...query, sort };
}

/** Every filter off; the sort order is a view choice, not a filter, and stays. */
export function clearFilters(query: CatalogueQuery): CatalogueQuery {
  return { ...DEFAULT_CATALOGUE_QUERY, sort: query.sort };
}

/**
 * How many filters are on (the number on the "Filters" button): one per category, colour and size
 * chosen, plus one for a price range of any shape. `ignoreCategory` is for a category page, where
 * the category is the page and not a filter.
 */
export function activeFilterCount(query: CatalogueQuery, ignoreCategory = false): number {
  const category = query.category !== undefined && !ignoreCategory ? 1 : 0;
  const price = query.minPrice !== undefined || query.maxPrice !== undefined ? 1 : 0;
  return category + query.color.length + query.size.length + price;
}

// ---------------------------------------------------------------------------------------------
// Filtering, sorting, facets
// ---------------------------------------------------------------------------------------------

/** The stock of one colour x size, as far as filtering is concerned. */
export interface StockedVariant {
  colorId: string;
  size: Size;
  stock: number;
}

/** What `filterProducts` reads. A full `Product` satisfies it, and so does `CatalogueItem`. */
export interface Filterable {
  category: Category;
  priceCents: number;
  variants: readonly StockedVariant[];
}

export interface Sortable {
  priceCents: number;
  createdAt: string;
}

/** What `computeFacets` reads. */
export interface FacetSource extends Filterable {
  colors: readonly Color[];
}

/**
 * The slice of a product the collection filters need, as plain JSON for the browser: the full
 * product (descriptions, images, every sold-out variant) stays on the server, where the cards are
 * rendered. Only variants with stock are kept, which gives the same filter results because a
 * sold-out variant never matches.
 */
export interface CatalogueItem extends FacetSource, Sortable {
  slug: string;
}

export function toCatalogueItem(product: Product): CatalogueItem {
  return {
    slug: product.slug,
    category: product.category,
    priceCents: product.priceCents,
    createdAt: product.createdAt,
    colors: product.colors,
    variants: product.variants
      .filter(isInStock)
      .map(({ colorId, size, stock }) => ({ colorId, size, stock })),
  };
}

/**
 * Filters a product list (FR-021). Category is exact. Colour and size (OR within each group, AND
 * across groups) match IN-STOCK variants only: a product qualifies when one variant satisfies every
 * chosen colour and size at once, so "grey + M" never returns a product whose grey is sold out in
 * M. Price bounds are inclusive whole units of `currency`, compared on the converted price.
 */
export function filterProducts<T extends Filterable>(
  products: readonly T[],
  query: CatalogueQuery,
  currency: Currency,
): T[] {
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
export function sortProducts<T extends Sortable>(products: readonly T[], sort: CatalogueSort): T[] {
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

/** The visible result: filtered by the query, then sorted by it. */
export function applyQuery<T extends Filterable & Sortable>(
  products: readonly T[],
  query: CatalogueQuery,
  currency: Currency,
): T[] {
  return sortProducts(filterProducts(products, query, currency), query.sort);
}

export interface CatalogueFacets {
  categories: Category[];
  colors: Color[];
  sizes: Size[];
  // Whole units of the active currency, rounded outwards; null for an empty list.
  priceRange: { min: number; max: number } | null;
}

/**
 * What the filter UI can offer for a product list: colours and sizes that have at least one in-stock
 * variant (first-seen order for colours, canonical order for sizes) and the price range in whole
 * units of `currency`.
 *
 * Contract for the Filters UI: pass the parsed query as `selected`. Values the visitor has already
 * chosen are always included, even when no product in the list has them in stock (for example
 * `category=lifestyle&color=white`), so the active filter always has a control to remove it.
 * `allColors` resolves a selected colour id to its colour; without `selected` only options with stock
 * are returned.
 */
export function computeFacets(
  products: readonly FacetSource[],
  currency: Currency,
  selected: Pick<CatalogueQuery, 'color' | 'size'>,
  allColors: readonly Color[],
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
    const color = allColors.find((candidate) => candidate.id === id);
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
