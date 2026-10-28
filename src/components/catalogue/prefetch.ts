/** Top-level routes under `src/app/[locale]/[currency]/` that Home and the catalogue link into. */
export type PrefetchRoute = 'shop' | 'collections' | 'products' | 'cart';

/**
 * Whether a route is eligible for prefetch; individual links can opt out to avoid speculative work.
 * A prefetch of a URL with no page is a 404 in the
 * console of every visit (Lighthouse best-practices, RULES 10, "no console errors"), so a route
 * prefetches only once its page exists. Flip the switch in the task that adds the page:
 * Product and cart pages are available from P1 T09–T10.
 * tests/unit/components/prefetch.test.ts fails whenever a switch disagrees with the filesystem, so a
 * new route cannot ship without its switch.
 */
export const PREFETCH: Readonly<Record<PrefetchRoute, boolean>> = {
  shop: true,
  collections: true,
  products: true,
  cart: true,
};

/** The `prefetch` prop for a link into `route`. */
export function prefetchFor(route: PrefetchRoute): boolean {
  return PREFETCH[route];
}
