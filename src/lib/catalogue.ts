import { z } from 'zod';
import { CATEGORY_ENTRIES } from '@/data/categories';
import { FEATURED_ESSENTIAL_IDS, PRODUCTS } from '@/data/products';
import {
  categorySchema,
  sizeSchema,
  type Category,
  type CategoryEntry,
  type Color,
  type Product,
  type Variant,
} from '@/data/schema';
import {
  MAX_PRICE_UNITS,
  SORTS,
  computeFacets,
  parseQueryParams,
  parseQuerySearch,
  type CatalogueFacets,
  type CatalogueQuery,
  type SearchParamsRecord,
} from '@/lib/catalogue-query';
import type { Currency } from '@/lib/money';

// The query vocabulary, filtering and sorting live in `catalogue-query.ts` (no seed data, no Zod, so
// the browser can use them); they are re-exported so server code keeps one import path.
export {
  DEFAULT_CATALOGUE_QUERY,
  DEFAULT_SORT,
  SORTS,
  activeFilterCount,
  applyQuery,
  clearFilters,
  filterProducts,
  serializeCatalogueQuery,
  sortProducts,
  toCatalogueItem,
  toggleColor,
  toggleSize,
  withCategory,
  withPriceBounds,
  withSort,
  type CatalogueFacets,
  type CatalogueItem,
  type CatalogueQuery,
  type CatalogueSort,
  type SearchParamsRecord,
} from '@/lib/catalogue-query';

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
// URL query state bound to the seed data (FR-021, SPEC 7.3). The rules are in `catalogue-query.ts`.
// ---------------------------------------------------------------------------------------------

const colorIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

/**
 * Zod description of a parsed query. The parser itself is plain code (it runs in the browser, where
 * Zod would cost a large share of the budget, ADR-0006); a test runs every parse result through this
 * schema, and the `ZodType<CatalogueQuery>` annotation fails typecheck if the two shapes drift.
 */
export const catalogueQuerySchema: z.ZodType<CatalogueQuery> = z.strictObject({
  category: categorySchema.optional(),
  color: z.array(colorIdSchema),
  size: z.array(sizeSchema),
  minPrice: z.int().min(0).max(MAX_PRICE_UNITS.THB).optional(),
  maxPrice: z.int().min(0).max(MAX_PRICE_UNITS.THB).optional(),
  sort: z.enum(SORTS),
});

/** Parses untrusted URL params; colours are checked against the catalogue. Never throws. */
export function parseCatalogueQuery(
  searchParams: SearchParamsRecord,
  currency: Currency,
): CatalogueQuery {
  return parseQueryParams(searchParams, currency, knownColorIds);
}

/** Same as `parseCatalogueQuery`, for a raw query string or `URLSearchParams`. */
export function parseCatalogueSearch(
  search: string | URLSearchParams,
  currency: Currency,
): CatalogueQuery {
  return parseQuerySearch(search, currency, knownColorIds);
}

/** Every colour of the catalogue, one entry per id (first product wins), for resolving URL values. */
export const ALL_COLORS: readonly Color[] = [
  ...new Map(
    PRODUCTS.flatMap((product) =>
      product.colors.map((color): [string, Color] => [color.id, color]),
    ),
  ).values(),
];

/**
 * What the filter UI can offer for a product list; see `computeFacets` for the contract on
 * `selected`.
 */
export function getFacets(
  products: readonly Product[],
  currency: Currency,
  selected: Pick<CatalogueQuery, 'color' | 'size'> = { color: [], size: [] },
): CatalogueFacets {
  return computeFacets(products, currency, selected, ALL_COLORS);
}
