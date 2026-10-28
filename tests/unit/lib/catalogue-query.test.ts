import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { CATEGORIES, SIZES, categorySchema, sizeSchema } from '@/data/schema';
import * as taxonomy from '@/data/taxonomy';
import {
  ALL_COLORS,
  catalogueQuerySchema,
  getAllProducts,
  getFacets,
  parseCatalogueSearch,
} from '@/lib/catalogue';
import { segmentToCurrency } from '@/lib/currency';
import { convertWholeUnits } from '@/lib/money';
import {
  DEFAULT_CATALOGUE_QUERY,
  SORTS,
  activeFilterCount,
  applyQuery,
  clearFilters,
  computeFacets,
  filterProducts,
  parseQueryParams,
  parseQuerySearch,
  serializeCatalogueQuery,
  toCatalogueItem,
  toggleColor,
  toggleSize,
  withCategory,
  withPriceBounds,
  withSort,
  type CatalogueQuery,
} from '@/lib/catalogue-query';
import { isSoldOut } from '@/lib/stock';

const query = (overrides: Partial<CatalogueQuery>): CatalogueQuery => ({
  ...DEFAULT_CATALOGUE_QUERY,
  ...overrides,
});

const products = getAllProducts();
const items = products.map(toCatalogueItem);
const known = new Set(ALL_COLORS.map((color) => color.id));

describe('taxonomy (RULES 2.4, ADR-0006)', () => {
  it('feeds the Zod enums, so the browser vocabulary cannot drift from the schema', () => {
    expect(categorySchema.options).toEqual([...taxonomy.CATEGORIES]);
    expect(sizeSchema.options).toEqual([...taxonomy.SIZES]);
    expect(CATEGORIES).toBe(taxonomy.CATEGORIES);
    expect(SIZES).toBe(taxonomy.SIZES);
  });
});

describe('CatalogueItem is a faithful slice of a product (FR-021, ADR-0006)', () => {
  // The browser filters items, the server's reference is the full product list: every query must
  // give the same slugs in the same order.
  const queries: CatalogueQuery[] = [
    DEFAULT_CATALOGUE_QUERY,
    query({ color: ['black'] }),
    query({ color: ['grey'], size: ['M'] }),
    query({ color: ['sand', 'white'], size: ['XXL'] }),
    query({ category: 'lifestyle', color: ['white'] }),
    query({ size: ['ONE'], sort: 'price-asc' }),
    query({ minPrice: 50, maxPrice: 90, sort: 'price-desc' }),
    query({ sort: 'newest' }),
    query({ category: 'accessories', minPrice: 1000 }),
  ];

  it.each(queries.map((entry) => [serializeCatalogueQuery(entry, 'USD') || 'default', entry]))(
    'gives the same result as the full products: %s',
    (_name, entry) => {
      for (const currency of ['USD', 'THB'] as const) {
        const fromProducts = applyQuery(products, entry as CatalogueQuery, currency).map(
          (product) => product.slug,
        );
        const fromItems = applyQuery(items, entry as CatalogueQuery, currency).map(
          (item) => item.slug,
        );
        expect(fromItems).toEqual(fromProducts);
      }
    },
  );

  it('keeps only variants that have stock and none of the descriptive fields', () => {
    const jogger = items.find((item) => item.slug === 'everyday-jogger');
    expect(jogger).toBeDefined();
    expect(jogger?.variants.every((variant) => variant.stock > 0)).toBe(true);
    expect(Object.keys(jogger ?? {}).toSorted()).toEqual([
      'category',
      'colors',
      'createdAt',
      'priceCents',
      'slug',
      'variants',
    ]);
    // Sold-out variants are dropped, so the item is smaller than the product.
    const full = products.find((product) => product.slug === 'everyday-jogger');
    expect(jogger?.variants.length).toBeLessThan(full?.variants.length ?? 0);
  });

  it('produces the same facets from items as from products', () => {
    for (const currency of ['USD', 'THB'] as const) {
      const selected = { color: ['white'], size: ['XXL' as const] };
      expect(computeFacets(items, currency, selected, ALL_COLORS)).toEqual(
        getFacets(products, currency, selected),
      );
    }
  });

  it('stays small enough to ship: the whole seed as JSON is about 10 kB (ADR-0006)', () => {
    expect(JSON.stringify(items).length).toBeLessThan(16_000);
  });
});

// ---------------------------------------------------------------------------------------------
// Property test: the browser parser (plain code, ADR-0006) against an independent Zod reference.
// ---------------------------------------------------------------------------------------------

/** Deterministic PRNG (mulberry32): the same cases on every run and every machine (RULES 12.4). */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sortSchema = z.enum(SORTS);
const tokens = (values: string[]): string[] =>
  values
    .flatMap((value) => value.split(','))
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

/**
 * What the parser did before it moved into the browser: validators are Zod schemas, structure is
 * written out again here. Shares only the currency arithmetic (tested on its own in money.test).
 */
function zodReference(
  params: URLSearchParams,
  currency: 'USD' | 'THB',
  knownColors: ReadonlySet<string>,
): CatalogueQuery {
  const all = (key: string): string[] => tokens(params.getAll(key));
  const first = (key: string): string | undefined => all(key)[0];
  const category = categorySchema.safeParse(first('category'));
  const color = [...new Set(all('color').map((token) => token.toLowerCase()))]
    .filter((id) => knownColors.has(id))
    .toSorted();
  const size = [
    ...new Set(
      all('size').flatMap((token) => {
        const parsed = sizeSchema.safeParse(token.toUpperCase());
        return parsed.success ? [parsed.data] : [];
      }),
    ),
  ].toSorted((a, b) => SIZES.indexOf(a) - SIZES.indexOf(b));
  const writtenIn = segmentToCurrency(first('priceCurrency')?.toLowerCase()) ?? currency;
  const cap = writtenIn === 'USD' ? 100_000 : 3_500_000;
  const price = (key: string): number | undefined => {
    const token = first(key);
    if (token === undefined || !/^\d+$/.test(token)) return undefined;
    const value = Number(token);
    return Number.isSafeInteger(value) && value <= cap ? value : undefined;
  };
  const rawMin = price('minPrice');
  const rawMax = price('maxPrice');
  let minPrice =
    rawMin === undefined ? undefined : convertWholeUnits(rawMin, writtenIn, currency, 'down');
  let maxPrice =
    rawMax === undefined ? undefined : convertWholeUnits(rawMax, writtenIn, currency, 'up');
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    minPrice = undefined;
    maxPrice = undefined;
  }
  const sort = sortSchema.safeParse(first('sort'));
  return {
    ...(category.success ? { category: category.data } : {}),
    color,
    size,
    ...(minPrice === undefined ? {} : { minPrice }),
    ...(maxPrice === undefined ? {} : { maxPrice }),
    sort: sort.success ? sort.data : 'featured',
  };
}

const KEYS = ['category', 'color', 'size', 'minPrice', 'maxPrice', 'priceCurrency', 'sort'];
const NOISE_KEYS = ['utm_source', 'fbclid', 'gclid', '__proto__', 'constructor', 'toString', 'x'];
const WORDS = [
  ...CATEGORIES,
  ...SORTS,
  ...SIZES,
  ...SIZES.map((size) => size.toLowerCase()),
  ...ALL_COLORS.map((color) => color.id),
  ...ALL_COLORS.map((color) => color.id.toUpperCase()),
  'usd',
  'THB',
  'thb',
  'eur',
  'nope',
  'Foundations',
  '',
  ' ',
  ' black ',
  'black,',
  ',sand,,white',
  '0',
  '00',
  '7',
  '20',
  '60',
  '2100',
  '99999',
  '100000',
  '100001',
  '3500000',
  '3500001',
  '12345678901234567890',
  '-5',
  '1e3',
  '20.5',
  '٢٠',
  'NaN',
  'Infinity',
  '%E0%A4%A',
  '\u0000',
  'ไทย',
  '<script>',
  '__proto__',
];

function randomSearch(random: () => number): string {
  const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)] as T;
  const params = new URLSearchParams();
  const count = Math.floor(random() * 9);
  for (let index = 0; index < count; index += 1) {
    const key = random() < 0.8 ? pick(KEYS) : pick(NOISE_KEYS);
    const value = random() < 0.25 ? `${pick(WORDS)},${pick(WORDS)}` : pick(WORDS);
    params.append(random() < 0.1 ? key.toUpperCase() : key, value);
  }
  return params.toString();
}

describe('the browser parser against an independent Zod reference (RULES 2.3, ADR-0006)', () => {
  const CASES = 2500;
  const random = mulberry32(0x5eed);
  const searches = Array.from({ length: CASES }, () => randomSearch(random));

  it('generates a varied, deterministic set of hostile queries', () => {
    expect(new Set(searches).size).toBeGreaterThan(CASES * 0.8);
    expect(searches.filter((search) => search.includes('priceCurrency')).length).toBeGreaterThan(
      100,
    );
    expect(searches.some((search) => /color=/.test(search))).toBe(true);
    // A second generator with the same seed gives the same cases.
    const again = mulberry32(0x5eed);
    expect(Array.from({ length: 50 }, () => randomSearch(again))).toEqual(searches.slice(0, 50));
  });

  it.each(['USD', 'THB'] as const)(
    'gives the same query as the Zod reference for %s, and a schema-valid, idempotent one',
    (currency) => {
      for (const search of searches) {
        const parsed = parseQuerySearch(search, currency, known);

        expect(parsed, search).toEqual(zodReference(new URLSearchParams(search), currency, known));
        expect(catalogueQuerySchema.safeParse(parsed).success, search).toBe(true);
        const again = parseQuerySearch(serializeCatalogueQuery(parsed, currency), currency, known);
        expect(again, search).toEqual(parsed);
      }
    },
  );

  it('keeps `parseCatalogueQuery` (the server-side wrapper) in step with the browser parser', () => {
    for (const search of searches.slice(0, 300)) {
      expect(parseCatalogueSearch(search, 'THB')).toEqual(parseQuerySearch(search, 'THB', known));
    }
  });

  it('takes the known colour ids from the caller, so the browser never needs the seed data', () => {
    const only = new Set(['black']);
    expect(parseQueryParams({ color: 'black,sand' }, 'USD', only).color).toEqual(['black']);
    expect(parseQueryParams({ color: 'black,sand' }, 'USD', known).color).toEqual([
      'black',
      'sand',
    ]);
  });

  it('round-trips a serialised query', () => {
    const original = query({
      category: 'performance',
      color: ['black', 'grey'],
      size: ['S', 'XL'],
      minPrice: 25,
      maxPrice: 80,
      sort: 'newest',
    });
    for (const currency of ['USD', 'THB'] as const) {
      expect(
        parseQuerySearch(serializeCatalogueQuery(original, currency), currency, known),
      ).toEqual(original);
    }
  });

  it('knows every sort the UI offers', () => {
    expect(SORTS).toEqual(['featured', 'price-asc', 'price-desc', 'newest']);
  });
});

describe('changing a query (the filter UI vocabulary)', () => {
  it('toggles a colour on and off without touching the others, and never mutates', () => {
    const start = query({ color: ['black'] });
    const added = toggleColor(start, 'sand');
    expect(added.color).toEqual(['black', 'sand']);
    expect(toggleColor(added, 'black').color).toEqual(['sand']);
    expect(start.color).toEqual(['black']);
  });

  it('toggles a size on and off', () => {
    const start = query({});
    expect(toggleSize(start, 'M').size).toEqual(['M']);
    expect(toggleSize(toggleSize(start, 'M'), 'M').size).toEqual([]);
  });

  it('sets and clears the category', () => {
    const set = withCategory(query({}), 'lifestyle');
    expect(set.category).toBe('lifestyle');
    expect(serializeCatalogueQuery(set, 'USD')).toBe('category=lifestyle');
    expect(serializeCatalogueQuery(withCategory(set, undefined), 'USD')).toBe('');
  });

  it('sets, clears and keeps each price bound independently', () => {
    const both = withPriceBounds(query({}), { min: 20, max: 60 });
    expect([both.minPrice, both.maxPrice]).toEqual([20, 60]);
    const keepMax = withPriceBounds(both, { min: undefined, max: null });
    expect([keepMax.minPrice, keepMax.maxPrice]).toEqual([undefined, 60]);
    const keepMin = withPriceBounds(both, { min: null, max: undefined });
    expect([keepMin.minPrice, keepMin.maxPrice]).toEqual([20, undefined]);
    expect(
      serializeCatalogueQuery(withPriceBounds(both, { min: undefined, max: undefined }), 'USD'),
    ).toBe('');
  });

  it('changes the sort', () => {
    expect(withSort(query({}), 'newest').sort).toBe('newest');
  });

  it('clears every filter but keeps the sort order', () => {
    const busy = query({
      category: 'lifestyle',
      color: ['black'],
      size: ['M'],
      minPrice: 10,
      maxPrice: 20,
      sort: 'price-desc',
    });
    const cleared = clearFilters(busy);
    expect(serializeCatalogueQuery(cleared, 'USD')).toBe('sort=price-desc');
    expect(activeFilterCount(cleared)).toBe(0);
  });

  it('counts one per category, colour and size, and one for a price range of any shape', () => {
    expect(activeFilterCount(DEFAULT_CATALOGUE_QUERY)).toBe(0);
    expect(activeFilterCount(query({ color: ['black', 'sand'], size: ['M'] }))).toBe(3);
    expect(activeFilterCount(query({ minPrice: 10 }))).toBe(1);
    expect(activeFilterCount(query({ minPrice: 10, maxPrice: 20 }))).toBe(1);
    expect(activeFilterCount(query({ category: 'lifestyle', maxPrice: 20 }))).toBe(2);
  });

  it('does not count the category on a category page, where it is the subject', () => {
    expect(activeFilterCount(query({ category: 'lifestyle', color: ['black'] }), true)).toBe(1);
  });
});

describe('filtering with the shared functions stays correct', () => {
  it('filterProducts works on plain items and returns the items it was given', () => {
    const result = filterProducts(items, query({ category: 'accessories' }), 'USD');
    expect(result.map((item) => item.slug).toSorted()).toEqual(
      products
        .filter((product) => product.category === 'accessories')
        .map((product) => product.slug)
        .toSorted(),
    );
    expect(result.every((item) => items.includes(item))).toBe(true);
  });

  it('never offers an out-of-stock combination: grey + M must not return a product whose grey M is gone', () => {
    const result = filterProducts(items, query({ color: ['grey'], size: ['M'] }), 'USD');
    for (const item of result) {
      expect(
        item.variants.some((variant) => variant.colorId === 'grey' && variant.size === 'M'),
      ).toBe(true);
    }
  });

  it('flags a product with no stock at all', () => {
    const base = products[0];
    if (base === undefined) throw new Error('seed missing');
    const soldOut = {
      ...base,
      variants: base.variants.map((variant) => ({ ...variant, stock: 0 })),
    };
    expect(isSoldOut(soldOut)).toBe(true);
    expect(isSoldOut(base)).toBe(false);
    expect(toCatalogueItem(soldOut).variants).toEqual([]);
  });
});
