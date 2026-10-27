import { describe, expect, it } from 'vitest';
import { CATEGORIES, SIZES, type Product } from '@/data/schema';
import {
  DEFAULT_CATALOGUE_QUERY,
  SORTS,
  catalogueQuerySchema,
  filterProducts,
  findVariantBySku,
  getAllCategories,
  getAllProducts,
  getCategory,
  getFacets,
  getFeaturedEssentials,
  getProductBySlug,
  getProductsByCategory,
  parseCatalogueQuery,
  parseCatalogueSearch,
  serializeCatalogueQuery,
  sortProducts,
  type CatalogueQuery,
} from '@/lib/catalogue';

const slugs = (products: readonly Product[]): string[] => products.map((product) => product.slug);

const query = (overrides: Partial<CatalogueQuery>): CatalogueQuery => ({
  ...DEFAULT_CATALOGUE_QUERY,
  ...overrides,
});

describe('catalogue lookups (FR-020, FR-012)', () => {
  it('exposes the 12 seed products in data order', () => {
    expect(getAllProducts()).toHaveLength(12);
    expect(slugs(getAllProducts())[0]).toBe('essential-tee');
  });

  it('finds a product by slug and returns undefined for an unknown slug', () => {
    expect(getProductBySlug('classic-cap')?.priceCents).toBe(3900);
    expect(getProductBySlug('nope')).toBeUndefined();
  });

  it('returns only products of the requested category', () => {
    for (const category of CATEGORIES) {
      const products = getProductsByCategory(category);
      expect(products.length).toBeGreaterThan(0);
      expect(products.every((product) => product.category === category)).toBe(true);
    }
  });

  it('features tee, hoodie, short and cap for the Home essentials grid', () => {
    expect(slugs(getFeaturedEssentials())).toEqual([
      'essential-tee',
      'premium-hoodie',
      'performance-short',
      'classic-cap',
    ]);
  });

  it('returns categories with localized names and subtitles', () => {
    expect(getAllCategories().map((entry) => entry.id)).toEqual([...CATEGORIES]);
    expect(getCategory('foundations')?.subtitle.en).toBe('The basics');
    expect(getCategory('foundations')?.name.th.length).toBeGreaterThan(0);
    expect(getCategory('shoes')).toBeUndefined();
  });

  it('resolves a SKU to its product and variant', () => {
    const match = findVariantBySku('performance-short-black-M');
    expect(match?.product.slug).toBe('performance-short');
    expect(match?.variant.colorId).toBe('black');
    expect(findVariantBySku('performance-short-black-ONE')).toBeUndefined();
  });
});

describe('parseCatalogueQuery (FR-021, SPEC 7.3)', () => {
  it('returns the defaults for empty params', () => {
    expect(parseCatalogueQuery({}, 'USD')).toEqual({ color: [], size: [], sort: 'featured' });
  });

  it('parses valid values', () => {
    expect(
      parseCatalogueQuery(
        {
          category: 'performance',
          color: 'black',
          size: 'M',
          minPrice: '20',
          maxPrice: '80',
          sort: 'price-asc',
        },
        'USD',
      ),
    ).toEqual({
      category: 'performance',
      color: ['black'],
      size: ['M'],
      minPrice: 20,
      maxPrice: 80,
      sort: 'price-asc',
    });
  });

  it('accepts repeated and comma-separated params and returns canonical order without duplicates', () => {
    const parsed = parseCatalogueQuery(
      {
        color: ['sand,black', 'sand'],
        size: ['XL', 'm,S'],
      },
      'USD',
    );
    expect(parsed.color).toEqual(['black', 'sand']);
    expect(parsed.size).toEqual(['S', 'M', 'XL']);
  });

  it('falls back to defaults for invalid values and never throws', () => {
    const parsed = parseCatalogueQuery(
      {
        category: 'shoes',
        color: 'neon,<script>,sand',
        size: 'HUGE,L',
        minPrice: 'abc',
        maxPrice: '-5',
        sort: 'cheapest',
      },
      'USD',
    );
    expect(parsed).toEqual({ color: ['sand'], size: ['L'], sort: 'featured' });
  });

  it.each([['12.5'], ['1e3'], [''], [' '], ['99999999'], ['0x10']])(
    'ignores the malformed price %j',
    (value) => {
      const parsed = parseCatalogueQuery({ minPrice: value, maxPrice: value }, 'USD');
      expect(parsed.minPrice).toBeUndefined();
      expect(parsed.maxPrice).toBeUndefined();
    },
  );

  it('discards a price range whose minimum is above its maximum', () => {
    const parsed = parseCatalogueQuery({ minPrice: '90', maxPrice: '30' }, 'USD');
    expect(parsed.minPrice).toBeUndefined();
    expect(parsed.maxPrice).toBeUndefined();
  });

  it('keeps a single price bound', () => {
    expect(parseCatalogueQuery({ minPrice: '40' }, 'USD').minPrice).toBe(40);
    expect(parseCatalogueQuery({ maxPrice: '0' }, 'USD').maxPrice).toBe(0);
  });

  it('reads price bounds as whole units of the active currency and caps them per currency', () => {
    expect(parseCatalogueQuery({ maxPrice: '3000000' }, 'THB').maxPrice).toBe(3_000_000);
    expect(parseCatalogueQuery({ maxPrice: '3000000' }, 'USD').maxPrice).toBeUndefined();
    expect(parseCatalogueQuery({ maxPrice: '100000' }, 'USD').maxPrice).toBe(100_000);
  });

  it('matches colours case-insensitively, like sizes', () => {
    const parsed = parseCatalogueQuery({ color: 'Black,SAND', size: 'm' }, 'USD');
    expect(parsed.color).toEqual(['black', 'sand']);
    expect(parsed.size).toEqual(['M']);
  });

  it('uses the first value when a single-value param repeats', () => {
    expect(parseCatalogueQuery({ sort: ['newest', 'price-asc'] }, 'USD').sort).toBe('newest');
  });

  it('survives hostile keys when parsing a raw query string', () => {
    const parsed = parseCatalogueSearch('__proto__=x&constructor=y&color=sand&color=forest', 'USD');
    expect(parsed.color).toEqual(['forest', 'sand']);
  });

  it('parses a URLSearchParams instance the same as a string', () => {
    const search = 'size=L&size=M&sort=newest';
    expect(parseCatalogueSearch(new URLSearchParams(search), 'USD')).toEqual(
      parseCatalogueSearch(search, 'USD'),
    );
  });

  it('produces values accepted by the query schema', () => {
    const parsed = parseCatalogueQuery(
      { category: 'lifestyle', color: 'grey', sort: 'newest' },
      'USD',
    );
    expect(catalogueQuerySchema.safeParse(parsed).success).toBe(true);
  });
});

describe('serializeCatalogueQuery', () => {
  it('omits defaults so the default view has an empty query string', () => {
    expect(serializeCatalogueQuery(DEFAULT_CATALOGUE_QUERY, 'USD')).toBe('');
    expect(serializeCatalogueQuery(query({ sort: 'featured' }), 'THB')).toBe('');
  });

  it('uses a stable key order and canonical value order, tagging the price currency', () => {
    const text = serializeCatalogueQuery(
      {
        sort: 'newest',
        maxPrice: 90,
        size: ['XL', 'S'],
        color: ['sand', 'black'],
        minPrice: 10,
        category: 'foundations',
      },
      'USD',
    );
    expect(text).toBe(
      'category=foundations&color=black,sand&size=S,XL&minPrice=10&maxPrice=90&priceCurrency=usd&sort=newest',
    );
  });

  it('tags the active currency, and only when a price bound is present', () => {
    expect(serializeCatalogueQuery(query({ maxPrice: 2000 }), 'THB')).toBe(
      'maxPrice=2000&priceCurrency=thb',
    );
    expect(serializeCatalogueQuery(query({ color: ['sand'] }), 'THB')).toBe('color=sand');
  });

  it.each(['USD', 'THB'] as const)('round-trips every kind of query in %s', (currency) => {
    const queries: CatalogueQuery[] = [
      DEFAULT_CATALOGUE_QUERY,
      query({ category: 'accessories' }),
      query({ color: ['black', 'forest', 'sand'] }),
      query({ size: ['XS', 'M', 'ONE'] }),
      query({ minPrice: 0, maxPrice: 0 }),
      query({ minPrice: 25 }),
      query({ maxPrice: 1700 }),
      ...SORTS.map((sort) => query({ sort })),
      query({
        category: 'lifestyle',
        color: ['grey', 'sand'],
        size: ['M', 'L', 'XXL'],
        minPrice: 20,
        maxPrice: 130,
        sort: 'price-desc',
      }),
    ];
    for (const original of queries) {
      const text = serializeCatalogueQuery(original, currency);
      expect(parseCatalogueSearch(text, currency)).toEqual(original);
      expect(serializeCatalogueQuery(parseCatalogueSearch(text, currency), currency)).toBe(text);
    }
  });

  it('normalises unordered input to the same string as its parsed form', () => {
    const messy = query({ color: ['sand', 'black', 'sand'], size: ['L', 'S'] });
    expect(serializeCatalogueQuery(messy, 'USD')).toBe('color=black,sand&size=S,L');
  });
});

describe('price bounds mean the same to every viewer (FR-021, SPEC 7.3)', () => {
  const all = getAllProducts();
  const shown = (search: string, currency: 'USD' | 'THB'): string[] =>
    slugs(filterProducts(all, parseCatalogueSearch(search, currency), currency));

  it('keeps a shared USD link meaningful for a THB viewer', () => {
    const link = 'maxPrice=60&priceCurrency=usd';
    expect(shown(link, 'USD')).toEqual(shown(link, 'THB'));
    expect(shown(link, 'THB')).toHaveLength(8);
    expect(parseCatalogueSearch(link, 'THB').maxPrice).toBe(2100);
  });

  it('keeps a shared THB link meaningful for a USD viewer', () => {
    const link = 'minPrice=700&maxPrice=2100&priceCurrency=thb';
    expect(parseCatalogueSearch(link, 'USD')).toMatchObject({ minPrice: 20, maxPrice: 60 });
    expect(shown(link, 'USD')).toEqual(shown(link, 'THB'));
  });

  it('survives a locale switch that flips the default currency (th to en)', () => {
    // /th/shop shows baht, /en/shop shows dollars; the link written on the Thai page keeps its unit.
    const written = serializeCatalogueQuery(query({ maxPrice: 2000 }), 'THB');
    expect(shown(written, 'THB')).toEqual(shown(written, 'USD'));
    expect(parseCatalogueSearch(written, 'USD').maxPrice).toBe(58);
  });

  it('survives a currency switch via cookie: the same URL, converted bounds', () => {
    const written = serializeCatalogueQuery(query({ minPrice: 20, maxPrice: 60 }), 'USD');
    expect(parseCatalogueSearch(written, 'THB')).toMatchObject({ minPrice: 700, maxPrice: 2100 });
    expect(parseCatalogueSearch(written, 'USD')).toMatchObject({ minPrice: 20, maxPrice: 60 });
  });

  it('never hides a product when the range is converted back to a coarser unit', () => {
    // 1,715 baht is exactly the tee ($49). A THB maximum of 1715 read by a USD viewer rounds up to 49.
    const link = 'maxPrice=1715&priceCurrency=thb';
    expect(shown(link, 'THB')).toContain('essential-tee');
    expect(shown(link, 'USD')).toContain('essential-tee');
    // 1,716 baht rounds up to $50, and a minimum of 1,716 rounds down to $49: the tee stays visible.
    expect(shown('minPrice=1716&priceCurrency=thb', 'USD')).toContain('essential-tee');
    expect(shown('maxPrice=1716&priceCurrency=thb', 'USD')).toContain('essential-tee');
  });

  it('reads an untagged bound as the active currency', () => {
    expect(parseCatalogueSearch('maxPrice=60', 'USD').maxPrice).toBe(60);
    expect(parseCatalogueSearch('maxPrice=2100', 'THB').maxPrice).toBe(2100);
  });

  it('falls back to the active currency for an unreadable tag and ignores a tag with no bound', () => {
    expect(parseCatalogueSearch('maxPrice=60&priceCurrency=eur', 'USD').maxPrice).toBe(60);
    expect(parseCatalogueSearch('priceCurrency=thb', 'USD')).toEqual(DEFAULT_CATALOGUE_QUERY);
  });

  it('accepts the tag in any letter case', () => {
    expect(parseCatalogueSearch('maxPrice=700&priceCurrency=THB', 'USD').maxPrice).toBe(20);
  });

  it('caps a bound by the currency it is written in, before converting', () => {
    expect(parseCatalogueSearch('maxPrice=3500000&priceCurrency=thb', 'USD').maxPrice).toBe(
      100_000,
    );
    expect(
      parseCatalogueSearch('maxPrice=3500001&priceCurrency=thb', 'USD').maxPrice,
    ).toBeUndefined();
    expect(
      parseCatalogueSearch('maxPrice=100001&priceCurrency=usd', 'THB').maxPrice,
    ).toBeUndefined();
  });

  it('drops a range whose converted minimum is above its maximum', () => {
    expect(parseCatalogueSearch('minPrice=90&maxPrice=30&priceCurrency=usd', 'THB')).toEqual(
      DEFAULT_CATALOGUE_QUERY,
    );
  });
});

describe('filterProducts (FR-021)', () => {
  const all = getAllProducts();

  it('returns every product for the default query', () => {
    expect(filterProducts(all, DEFAULT_CATALOGUE_QUERY, 'USD')).toHaveLength(12);
  });

  it('filters by category', () => {
    const result = filterProducts(all, query({ category: 'accessories' }), 'USD');
    expect(slugs(result)).toEqual(['classic-cap', 'knit-beanie', 'canvas-tote']);
  });

  it('filters by colour using in-stock variants only', () => {
    const grey = slugs(filterProducts(all, query({ color: ['grey'] }), 'USD'));
    // The jogger is grey on paper but fully sold out in grey.
    expect(grey).not.toContain('everyday-jogger');
    expect(grey).toContain('premium-hoodie');
    expect(grey).toContain('knit-beanie');
  });

  it('filters by size, matching any selected size', () => {
    const oneSize = slugs(filterProducts(all, query({ size: ['ONE'] }), 'USD'));
    expect(oneSize).toEqual(['classic-cap', 'knit-beanie', 'canvas-tote']);
    const sockSizes = slugs(filterProducts(all, query({ size: ['S', 'ONE'] }), 'USD'));
    expect(sockSizes).toContain('essential-socks');
    expect(sockSizes).toContain('canvas-tote');
  });

  it('requires one variant to satisfy the colour and size together', () => {
    // Sand tee is sold out in XXL; no other sand product in the seed has XXL either except the hoodie.
    const result = slugs(filterProducts(all, query({ color: ['sand'], size: ['XXL'] }), 'USD'));
    expect(result).not.toContain('essential-tee');
    expect(result).toContain('premium-hoodie');
  });

  it('excludes a product whose only matching variants are sold out', () => {
    const result = filterProducts(all, query({ color: ['grey'], size: ['XS'] }), 'USD');
    expect(slugs(result)).not.toContain('everyday-jogger');
  });

  it('treats price bounds as inclusive whole USD units', () => {
    const result = filterProducts(all, query({ minPrice: 54, maxPrice: 59 }), 'USD');
    expect(slugs(result)).toEqual(['performance-short', 'relaxed-short']);
  });

  it('compares price bounds in the active currency (THB baht)', () => {
    // $59 = 2,065 baht, $54 = 1,890 baht.
    const result = filterProducts(all, query({ minPrice: 2000, maxPrice: 2100 }), 'THB');
    expect(slugs(result)).toEqual(['performance-short']);
    const inclusive = filterProducts(all, query({ minPrice: 2065, maxPrice: 2065 }), 'THB');
    expect(slugs(inclusive)).toEqual(['performance-short']);
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterProducts(all, query({ minPrice: 9000 }), 'USD')).toEqual([]);
  });

  it('does not change the input list', () => {
    const before = slugs(all);
    filterProducts(all, query({ category: 'lifestyle' }), 'USD');
    expect(slugs(all)).toEqual(before);
  });
});

describe('sortProducts (FR-021)', () => {
  const all = getAllProducts();

  it('keeps data order for featured', () => {
    expect(slugs(sortProducts(all, 'featured'))).toEqual(slugs(all));
  });

  it('sorts by price ascending and descending', () => {
    const asc = sortProducts(all, 'price-asc').map((product) => product.priceCents);
    const desc = sortProducts(all, 'price-desc').map((product) => product.priceCents);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
    expect(asc[0]).toBe(1900);
    expect(desc[0]).toBe(12_900);
  });

  it('sorts newest first by createdAt and keeps data order for equal dates', () => {
    const newest = sortProducts(all, 'newest');
    const dates = newest.map((product) => product.createdAt);
    expect(dates).toEqual([...dates].sort().reverse());
    // performance-long-sleeve and performance-socks share a date; data order is preserved.
    const long = slugs(newest).indexOf('performance-long-sleeve');
    expect(slugs(newest).indexOf('performance-socks')).toBe(long + 1);
  });

  it('keeps ties in input order for price sorts', () => {
    const tee = getProductBySlug('essential-tee');
    const cap = getProductBySlug('classic-cap');
    if (tee === undefined || cap === undefined) throw new Error('missing seed product');
    const twin: Product = { ...cap, id: 'p-twin', slug: 'twin', priceCents: tee.priceCents };
    expect(slugs(sortProducts([twin, tee], 'price-asc'))).toEqual(['twin', 'essential-tee']);
    expect(slugs(sortProducts([tee, twin], 'price-desc'))).toEqual(['essential-tee', 'twin']);
  });

  it('returns a new array and leaves the input alone', () => {
    const input = [...all];
    const sorted = sortProducts(input, 'price-desc');
    expect(sorted).not.toBe(input);
    expect(slugs(input)).toEqual(slugs(all));
  });
});

describe('getFacets (FR-021)', () => {
  it('lists colours, sizes in canonical order and the price range in USD', () => {
    const facets = getFacets(getAllProducts(), 'USD');
    expect(facets.colors.map((color) => color.id).sort()).toEqual([
      'black',
      'forest',
      'grey',
      'sand',
      'white',
    ]);
    expect(facets.sizes).toEqual([...SIZES]);
    expect(facets.priceRange).toEqual({ min: 19, max: 129 });
    expect(facets.categories).toEqual([...CATEGORIES]);
  });

  it('reports the price range in whole baht for THB', () => {
    expect(getFacets(getAllProducts(), 'THB').priceRange).toEqual({ min: 665, max: 4515 });
  });

  it('only offers colours and sizes that have an in-stock variant', () => {
    const jogger = getProductBySlug('everyday-jogger');
    if (jogger === undefined) throw new Error('missing seed product');
    const facets = getFacets([jogger], 'USD');
    expect(facets.colors.map((color) => color.id)).toEqual(['black', 'sand', 'forest']);
    expect(facets.sizes).toEqual(['XS', 'S', 'M', 'L', 'XL', 'XXL']);
  });

  it('keeps selected values in the facets even when nothing in the list has them in stock', () => {
    const lifestyle = getProductsByCategory('lifestyle');
    const plain = getFacets(lifestyle, 'USD');
    expect(plain.colors.map((color) => color.id)).not.toContain('white');
    const withSelection = getFacets(lifestyle, 'USD', { color: ['white', 'grey'], size: ['ONE'] });
    expect(withSelection.colors.map((color) => color.id)).toContain('white');
    expect(withSelection.colors.find((color) => color.id === 'white')?.name.th).toBe('ขาว');
    expect(withSelection.sizes).toContain('ONE');
    // Selected values slot into canonical order instead of being appended.
    expect(withSelection.sizes).toEqual([...SIZES]);
  });

  it('does not duplicate selected values that are already offered', () => {
    const facets = getFacets(getAllProducts(), 'USD', { color: ['black'], size: ['M'] });
    expect(facets.colors.filter((color) => color.id === 'black')).toHaveLength(1);
    expect(facets.sizes.filter((size) => size === 'M')).toHaveLength(1);
  });

  it('returns empty facets and a null price range for an empty list', () => {
    expect(getFacets([], 'USD')).toEqual({
      categories: [],
      colors: [],
      sizes: [],
      priceRange: null,
    });
  });

  it('rounds the price range outwards to whole units', () => {
    const tee = getProductBySlug('essential-tee');
    if (tee === undefined) throw new Error('missing seed product');
    const cheap: Product = { ...tee, priceCents: 1999 };
    const dear: Product = { ...tee, priceCents: 2001 };
    expect(getFacets([cheap, dear], 'USD').priceRange).toEqual({ min: 19, max: 21 });
  });
});
