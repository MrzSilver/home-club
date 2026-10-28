// Pre-paint "hold" for a collection URL that carries catalogue filters (ADR-0006).
//
// The static HTML always holds the full default grid. A visitor who arrives on a filtered link would
// see that grid for a moment and then watch it change when React takes over, which moves content
// that was already on screen (layout shift). This inline script runs while the HTML is parsed, before
// the first paint: when the URL has a query parameter that can change the default view it adds a
// style element that hides the results area, the count and the filter chips (`visibility: hidden`
// keeps the layout, so nothing moves), and the island removes that element as soon as it has
// rendered the filtered result. A timer removes it anyway after a few seconds, so a failed script
// bundle never leaves the grid hidden.
//
// Only catalogue parameters count. Tracking parameters (`utm_*`, `fbclid`, `gclid`) are on exactly the
// links people share and change nothing, so they must not delay the first paint of a grid that will
// not change: holding for them made the largest paint wait for hydration (review r1, measured 3x).
// `sort=featured` is the default order and holds nothing either.
export const HOLD_STYLE_ID = 'catalogue-hold';
export const HOLD_ATTRIBUTE = 'data-catalogue-pending';
export const HOLD_TIMEOUT_MS = 4000;
/** Query parameters that can change the default view (mirrors `parseQueryParams`, except `sort`). */
export const HOLD_KEYS = [
  'category',
  'color',
  'size',
  'minPrice',
  'maxPrice',
  'priceCurrency',
] as const;

export const HOLD_SCRIPT =
  `(function(){var p=new URLSearchParams(location.search),h=p.has('sort')&&p.get('sort')!=='featured';` +
  `${JSON.stringify(HOLD_KEYS).replaceAll('"', "'")}.forEach(function(k){if(p.has(k))h=true});` +
  `if(h&&!document.getElementById('${HOLD_STYLE_ID}')){` +
  `var s=document.createElement('style');s.id='${HOLD_STYLE_ID}';` +
  `s.textContent='[${HOLD_ATTRIBUTE}]{visibility:hidden}';document.head.appendChild(s);` +
  `setTimeout(function(){s.remove()},${HOLD_TIMEOUT_MS})}})()`;
