/** Top-level routes under `src/app/[locale]/[currency]/` that Home and the catalogue link into. */
export type PrefetchRoute = 'shop' | 'collections' | 'products' | 'cart';

/**
 * Whether links into each route prefetch their page. A prefetch of a URL with no page is a 404 in the
 * console of every visit (Lighthouse best-practices, RULES 10, "no console errors"), so a route
 * prefetches only once its page exists. Flip the switch in the task that adds the page:
 * TODO(T09) `products`; TODO(T10) `cart`.
 * tests/unit/components/prefetch.test.ts fails whenever a switch disagrees with the filesystem, so a
 * new route cannot ship without its switch.
 */
export const PREFETCH: Readonly<Record<PrefetchRoute, boolean>> = {
  shop: true,
  collections: true,
  products: false,
  cart: false,
};

/** The `prefetch` prop for a link into `route`. */
export function prefetchFor(route: PrefetchRoute): boolean {
  return PREFETCH[route];
}
