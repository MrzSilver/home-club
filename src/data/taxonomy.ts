// Ordered const tuples are the single source for every literal union in the catalogue (RULES 2.4: no
// enums). They live apart from `schema.ts` because that file imports Zod: client islands that only
// need the vocabularies (the collection filters, ADR-0006) import them from here and keep Zod out of
// the browser bundle. `schema.ts` re-exports everything below, so server code is unaffected.
export const CATEGORIES = ['foundations', 'performance', 'lifestyle', 'accessories'] as const;
export const VIBES = ['performance', 'outdoor', 'lazy', 'skate', 'hockey'] as const;
export const SLOTS = ['top', 'bottom', 'cap', 'socks'] as const;
// Canonical display order: apparel XS to XXL, then the one-size value.
export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'ONE'] as const;

// RULES 7.4 / SPEC 7.1: the cart cap. Lives next to CartLine so the schema and lib/stock share it.
export const MAX_QTY_PER_LINE = 10;
