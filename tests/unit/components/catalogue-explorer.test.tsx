import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CatalogueExplorer } from '@/components/catalogue/catalogue-explorer';
import { HOLD_STYLE_ID } from '@/components/catalogue/query-hold';
import type { Category } from '@/data/schema';
import { ALL_COLORS, getAllCategories, getAllProducts } from '@/lib/catalogue';
import { toCatalogueItem } from '@/lib/catalogue-query';
import en from '@messages/en.json';
import th from '@messages/th.json';
import { currencySymbol } from '@/lib/money';
import { mockMatchMedia } from '../helpers/match-media';

// The watcher reads the router's committed search params; tests drive them by hand.
// It is a real store, so a change re-renders only the components that read it, like the router does.
const { routerSearch } = vi.hoisted(() => ({
  routerSearch: {
    value: '',
    listeners: new Set<() => void>(),
    set(next: string): void {
      this.value = next;
      for (const listener of this.listeners) listener();
    },
  },
}));
vi.mock('next/navigation', async () => {
  const { useSyncExternalStore } = await import('react');
  return {
    useSearchParams: (): URLSearchParams => {
      const value = useSyncExternalStore(
        (listener) => {
          routerSearch.listeners.add(listener);
          return () => routerSearch.listeners.delete(listener);
        },
        () => routerSearch.value,
        () => routerSearch.value,
      );
      return new URLSearchParams(value);
    },
  };
});

const products = getAllProducts();
const items = products.map(toCatalogueItem);
const cards = Object.fromEntries(
  products.map((product) => [product.slug, <span key={product.slug}>{product.name.en}</span>]),
);

// The grid is the only list whose items are the cards.
function gridSlugs(): string[] {
  const names = new Set(products.map((product) => product.name.en));
  return screen
    .queryAllByRole('listitem')
    .map((item) => item.textContent ?? '')
    .filter((text) => names.has(text))
    .map((text) => products.find((product) => product.name.en === text)?.slug ?? text);
}

type Options = {
  locale?: 'en' | 'th';
  currency?: 'USD' | 'THB';
  scope?: Category | null;
  search?: string;
  mobile?: boolean;
};

function explorerTree({
  locale = 'en',
  currency = 'USD',
  scope = null,
}: Options = {}): ReactElement {
  const scoped = scope === null ? items : items.filter((item) => item.category === scope);
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={{ catalogue: (locale === 'th' ? th : en).catalogue }}
    >
      <CatalogueExplorer
        scope={scope}
        currency={currency}
        currencySymbol={currencySymbol(currency, locale)}
        items={scoped}
        cards={cards}
        colors={ALL_COLORS}
        categories={getAllCategories().map(({ id, name }) => ({ id, name: name[locale] }))}
      />
    </NextIntlClientProvider>
  );
}

function renderExplorer(options: Options = {}): ReturnType<typeof render> {
  window.history.replaceState(null, '', `/${options.locale ?? 'en'}/shop${options.search ?? ''}`);
  routerSearch.value = options.search ?? '';
  return render(explorerTree(options));
}

function selectSort(select: HTMLElement, value: string): void {
  fireEvent.change(select, { target: { value } });
}

const count = (): string =>
  screen.getByText(/^\d+ (products?|รายการ)$/, { selector: 'p[role="status"]' }).textContent ?? '';
const url = (): string => `${window.location.pathname}${window.location.search}`;

beforeEach(() => {
  routerSearch.value = '';
  mockMatchMedia();
  document.getElementById(HOLD_STYLE_ID)?.remove();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

describe('collection explorer: default view (FR-020, FR-022)', () => {
  it('shows every product in featured (data) order with the count', () => {
    renderExplorer();

    expect(gridSlugs()).toEqual(products.map((product) => product.slug));
    expect(count()).toBe('12 products');
    expect(screen.getByRole('heading', { level: 2, name: 'Products' })).toBeInTheDocument();
  });

  it('shows a category page its own products only and no category control', () => {
    renderExplorer({ scope: 'accessories' });

    expect(gridSlugs()).toEqual(
      products.filter((product) => product.category === 'accessories').map((p) => p.slug),
    );
    expect(screen.queryByRole('group', { name: 'Category' })).not.toBeInTheDocument();
  });

  it('shows the Thai copy, with a plural-free count', () => {
    renderExplorer({ locale: 'th' });

    expect(count()).toBe('12 รายการ');
    expect(screen.getByRole('combobox', { name: 'เรียงตาม' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'สี' })).toBeInTheDocument();
  });

  it('releases the pre-paint hold when it has rendered (ADR-0006)', () => {
    const hold = document.createElement('style');
    hold.id = HOLD_STYLE_ID;
    document.head.appendChild(hold);

    renderExplorer();

    expect(document.getElementById(HOLD_STYLE_ID)).toBeNull();
  });

  it('marks everything that changes with the URL for the hold: Filters button, count, chips, results', () => {
    renderExplorer({ search: '?color=black' });

    const held = [...document.querySelectorAll('[data-catalogue-pending]')];
    expect(
      held.some((node) => node.tagName === 'BUTTON' && node.textContent?.includes('Filters')),
    ).toBe(true);
    expect(held).toContain(screen.getByTestId('result-count'));
    expect(
      held.some(
        (node) => node.querySelector('ul')?.getAttribute('aria-label') === 'Active filters',
      ),
    ).toBe(true);
    expect(held.some((node) => node.querySelector('h2')?.textContent === 'Products')).toBe(true);
  });
});

describe('URL to state (FR-021)', () => {
  it('renders the filtered result for a link that carries a query', () => {
    renderExplorer({ search: '?color=black&size=M&sort=price-asc' });

    const expected = products
      .filter((product) =>
        product.variants.some(
          (variant) => variant.colorId === 'black' && variant.size === 'M' && variant.stock > 0,
        ),
      )
      .toSorted((a, b) => a.priceCents - b.priceCents)
      .map((product) => product.slug);
    expect(gridSlugs()).toEqual(expected);
    expect(count()).toBe(`${expected.length} products`);
    expect(screen.getByRole('checkbox', { name: 'Black' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'M' })).toBeChecked();
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveValue('price-asc');
  });

  it('ignores junk in the URL and shows the default view', () => {
    renderExplorer({ search: '?color=nope&size=huge&sort=sideways&minPrice=abc' });

    expect(count()).toBe('12 products');
    expect(screen.queryByRole('list', { name: 'Active filters' })).not.toBeInTheDocument();
  });

  it('follows Back and Forward: a popstate re-reads the URL', () => {
    renderExplorer({ search: '?color=sand' });
    const sandOnly = count();

    act(() => {
      window.history.replaceState(null, '', '/en/shop');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(count()).toBe('12 products');
    expect(count()).not.toBe(sandOnly);

    act(() => {
      window.history.replaceState(null, '', '/en/shop?size=XXL');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(screen.getByRole('checkbox', { name: 'XXL' })).toBeChecked();
  });

  it('re-reads the URL after a Next.js navigation to the same page (menu "Shop all" from a filtered list)', () => {
    renderExplorer({ search: '?color=grey&size=S' });
    expect(screen.getAllByRole('button', { name: /^Remove filter: / })).toHaveLength(2);

    // Next commits `/en/shop` with its own pushState (no popstate, no event), then the router's search
    // params change and the watcher's effect runs.
    act(() => {
      window.history.pushState({ __NA: true }, '', '/en/shop');
      routerSearch.set('');
    });

    expect(count()).toBe('12 products');
    expect(screen.queryByRole('list', { name: 'Active filters' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Grey' })).not.toBeChecked();
  });

  it('on a category page ignores ?category= and never writes it', async () => {
    renderExplorer({ scope: 'lifestyle', search: '?category=accessories' });

    expect(gridSlugs()).toEqual(
      products.filter((product) => product.category === 'lifestyle').map((p) => p.slug),
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Black' }));
    expect(url()).toBe('/en/shop?color=black');
  });
});

describe('state to URL (FR-021)', () => {
  it('writes a colour choice to the URL with replace, not push, and filters the grid', async () => {
    renderExplorer();
    const entries = window.history.length;

    fireEvent.click(screen.getByRole('checkbox', { name: 'Grey' }));

    expect(url()).toBe('/en/shop?color=grey');
    expect(window.history.length).toBe(entries);
    expect(gridSlugs().length).toBeLessThan(12);
    expect(gridSlugs().length).toBeGreaterThan(0);
  });

  it('combines colour, size and category in the URL and removes them again', async () => {
    renderExplorer();

    fireEvent.click(screen.getByRole('radio', { name: 'Lifestyle' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Black' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'L' }));
    expect(url()).toBe('/en/shop?category=lifestyle&color=black&size=L');

    fireEvent.click(screen.getByRole('checkbox', { name: 'L' }));
    fireEvent.click(screen.getByRole('radio', { name: 'All' }));
    expect(url()).toBe('/en/shop?color=black');
  });

  it('keeps the other parameters of the live URL when one changes', async () => {
    renderExplorer({ search: '?sort=newest' });

    fireEvent.click(screen.getByRole('checkbox', { name: 'Sand' }));

    expect(url()).toBe('/en/shop?color=sand&sort=newest');
  });

  it('sorts by every option and writes it', async () => {
    renderExplorer();
    const select = screen.getByRole('combobox', { name: 'Sort by' });

    selectSort(select, 'price-asc');
    const prices = gridSlugs().map(
      (slug) => products.find((p) => p.slug === slug)?.priceCents ?? 0,
    );
    expect(prices).toEqual(prices.toSorted((a, b) => a - b));
    expect(url()).toBe('/en/shop?sort=price-asc');

    selectSort(select, 'price-desc');
    const dearest = gridSlugs().map(
      (slug) => products.find((p) => p.slug === slug)?.priceCents ?? 0,
    );
    expect(dearest).toEqual(dearest.toSorted((a, b) => b - a));

    selectSort(select, 'newest');
    const dates = gridSlugs().map((slug) => products.find((p) => p.slug === slug)?.createdAt ?? '');
    expect(dates).toEqual(dates.toSorted().toReversed());

    selectSort(select, 'featured');
    expect(url()).toBe('/en/shop');
    expect(gridSlugs()).toEqual(products.map((product) => product.slug));
  });

  it('offers only colours and sizes that exist, and every size has a visible name', () => {
    renderExplorer({ scope: 'accessories' });

    const sizes = within(screen.getByRole('group', { name: 'Size' })).getAllByRole('checkbox');
    expect(sizes.map((box) => box.closest('label')?.textContent)).toContain('One size');
  });
});

describe('price range (FR-021)', () => {
  it('writes the range after the debounce, with the currency tag', () => {
    vi.useFakeTimers();
    renderExplorer();
    const min = screen.getByRole('textbox', { name: 'Min' });

    fireEvent.change(min, { target: { value: '50' } });
    expect(url()).toBe('/en/shop');
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(url()).toBe('/en/shop');
    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(url()).toBe('/en/shop?minPrice=50&priceCurrency=usd');
    expect(min).toHaveValue('50');
    expect(count()).toBe(
      `${products.filter((product) => product.priceCents >= 5000).length} products`,
    );
  });

  it('restarts the debounce on every keystroke, so one write follows the last one', () => {
    vi.useFakeTimers();
    renderExplorer();
    const max = screen.getByRole('textbox', { name: 'Max' });

    fireEvent.change(max, { target: { value: '6' } });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    fireEvent.change(max, { target: { value: '60' } });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(url()).toBe('/en/shop');
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(url()).toBe('/en/shop?maxPrice=60&priceCurrency=usd');
  });

  it('applies at once on blur and on Enter', () => {
    vi.useFakeTimers();
    renderExplorer();
    const min = screen.getByRole('textbox', { name: 'Min' });
    const max = screen.getByRole('textbox', { name: 'Max' });

    fireEvent.change(min, { target: { value: '20' } });
    fireEvent.blur(min);
    expect(url()).toBe('/en/shop?minPrice=20&priceCurrency=usd');

    fireEvent.change(max, { target: { value: '60' } });
    fireEvent.keyDown(max, { key: 'Enter' });
    expect(url()).toBe('/en/shop?minPrice=20&maxPrice=60&priceCurrency=usd');
  });

  it('accepts digits only', () => {
    vi.useFakeTimers();
    renderExplorer();
    const min = screen.getByRole('textbox', { name: 'Min' });

    fireEvent.change(min, { target: { value: '1a2.5-' } });

    expect(min).toHaveValue('125');
  });

  it('does not write a range whose minimum is above its maximum, and says why', () => {
    vi.useFakeTimers();
    renderExplorer();
    const min = screen.getByRole('textbox', { name: 'Min' });
    const max = screen.getByRole('textbox', { name: 'Max' });

    fireEvent.change(max, { target: { value: '30' } });
    fireEvent.blur(max);
    fireEvent.change(min, { target: { value: '90' } });
    fireEvent.blur(min);

    expect(url()).toBe('/en/shop?maxPrice=30&priceCurrency=usd');
    expect(min).toHaveValue('90');
    expect(min).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent(en.catalogue.filters.price.error);
    expect(min.getAttribute('aria-describedby')).toBe(screen.getByRole('alert').id);

    fireEvent.change(max, { target: { value: '120' } });
    fireEvent.blur(max);

    expect(url()).toBe('/en/shop?minPrice=90&maxPrice=120&priceCurrency=usd');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a USD link in baht to a THB visitor, rounded outwards (shared link, ADR-0003)', () => {
    renderExplorer({ currency: 'THB', search: '?minPrice=20&maxPrice=60&priceCurrency=usd' });

    expect(screen.getByRole('textbox', { name: 'Min' })).toHaveValue('700');
    expect(screen.getByRole('textbox', { name: 'Max' })).toHaveValue('2100');
    expect(screen.getByRole('group', { name: 'Price (฿)' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^Remove filter: .*฿700 to ฿2,100$/ }),
    ).toBeInTheDocument();
  });

  it('writes baht bounds with the baht tag', () => {
    vi.useFakeTimers();
    renderExplorer({ currency: 'THB' });

    fireEvent.change(screen.getByRole('textbox', { name: 'Max' }), { target: { value: '2000' } });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Max' }), { key: 'Enter' });

    expect(url()).toBe('/en/shop?maxPrice=2000&priceCurrency=thb');
  });

  it('shows what the URL says again after another control changed it (no stale draft)', () => {
    vi.useFakeTimers();
    renderExplorer();
    const min = screen.getByRole('textbox', { name: 'Min' });
    fireEvent.change(min, { target: { value: '50' } });
    fireEvent.blur(min);

    fireEvent.click(screen.getByRole('button', { name: /^Remove filter: / }));

    expect(min).toHaveValue('');
  });
});

describe('active filter chips (FR-021)', () => {
  it('shows one chip per active filter, even when nothing matches, and removes each', async () => {
    renderExplorer({
      search: '?category=lifestyle&color=white&size=XXL&minPrice=10&priceCurrency=usd',
    });

    const chips = within(screen.getByRole('list', { name: 'Active filters' }));
    expect(chips.getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual(
      [
        'Remove filter: Lifestyle',
        'Remove filter: White',
        'Remove filter: XXL',
        expect.stringMatching(/^Remove filter: From \$10\.00$/),
      ],
    );

    fireEvent.click(chips.getByRole('button', { name: 'Remove filter: White' }));
    expect(url()).not.toContain('color=');
    fireEvent.click(screen.getByRole('button', { name: 'Remove filter: XXL' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove filter: Lifestyle' }));
    fireEvent.click(screen.getByRole('button', { name: /^Remove filter: From/ }));
    expect(url()).toBe('/en/shop');
    expect(screen.queryByRole('list', { name: 'Active filters' })).not.toBeInTheDocument();
  });

  it('names the colour with a swatch plus its text on the chip', () => {
    renderExplorer({ search: '?color=forest' });

    const chip = screen.getByRole('button', { name: 'Remove filter: Forest' });
    expect(chip).toHaveTextContent('Forest');
    expect(chip.querySelector('[aria-hidden="true"][style]')).not.toBeNull();
  });

  it('clears everything with "Clear all" but keeps the sort order', async () => {
    renderExplorer({ search: '?color=black&size=M&sort=price-desc' });

    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));

    expect(url()).toBe('/en/shop?sort=price-desc');
    expect(count()).toBe('12 products');
  });

  it('keeps focus in the list after removing a chip, and falls back to the count when none are left', async () => {
    renderExplorer({ search: '?color=black,sand&size=M' });

    fireEvent.click(screen.getByRole('button', { name: 'Remove filter: Black' }));
    expect(screen.getByRole('button', { name: 'Remove filter: Sand' })).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Remove filter: M' }));
    expect(screen.getByRole('button', { name: 'Remove filter: Sand' })).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Remove filter: Sand' }));
    expect(screen.getByText(/^12 products$/, { selector: 'p[role="status"]' })).toHaveFocus();
  });
});

describe('zero results (SPEC 13a)', () => {
  const NO_MATCH = '?category=accessories&size=XXL';

  it('replaces the grid with a message and a primary "Clear filters" action', async () => {
    renderExplorer({ search: NO_MATCH });

    expect(count()).toBe('0 products');
    expect(gridSlugs()).toEqual([]);
    expect(
      screen.getByRole('heading', { level: 2, name: en.catalogue.empty.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(en.catalogue.empty.body)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(url()).toBe('/en/shop');
    expect(gridSlugs()).toHaveLength(12);
    expect(screen.getByText(/^12 products$/, { selector: 'p[role="status"]' })).toHaveFocus();
  });

  it('speaks Thai', () => {
    renderExplorer({ locale: 'th', search: NO_MATCH });

    expect(
      screen.getByRole('heading', { level: 2, name: th.catalogue.empty.title }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: th.catalogue.empty.action })).toBeInTheDocument();
  });
});

describe('live region (WCAG 4.1.3)', () => {
  it('is a polite status that always holds the current count', async () => {
    renderExplorer();
    const status = screen.getByText('12 products', { selector: 'p[role="status"]' });

    expect(status).toHaveAttribute('role', 'status');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Grey' }));

    expect(status).toBe(screen.getByText(/^\d+ products?$/, { selector: 'p[role="status"]' }));
    expect(status.textContent).not.toBe('12 products');
  });

  it('uses the singular for one product', () => {
    renderExplorer({ search: '?category=accessories&color=forest&size=ONE' });

    expect(count()).toMatch(/^1 product$/);
  });
});

describe('filters drawer below the sidebar breakpoint (RULES 8.6)', () => {
  it('opens a modal dialog with the same controls, shows the live result count and closes on Esc with focus back on the button', async () => {
    renderExplorer({ search: '?color=black' });
    const trigger = screen.getByRole('button', { name: 'Filters (1)', hidden: true });

    fireEvent.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: 'Filters' });

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(within(dialog).getByRole('checkbox', { name: 'Black' })).toBeChecked();
    const show = within(dialog).getByRole('button', { name: /^Show \d+ results$/ });
    expect(show).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Black' }));
    expect(within(dialog).getByRole('button', { name: 'Show 12 results' })).toBeInTheDocument();
    expect(url()).toBe('/en/shop');

    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it.each([
    ['en', 'Show 0 results', 'Filters (2)'],
    ['th', 'ดู 0 รายการ', 'ตัวกรอง (2)'],
  ] as const)(
    'names the drawer action, not a status, when nothing matches (%s)',
    async (locale, label, trigger) => {
      renderExplorer({ locale, search: '?category=accessories&size=XXL' });

      fireEvent.click(screen.getByRole('button', { name: trigger, hidden: true }));
      const dialog = await screen.findByRole('dialog');

      expect(within(dialog).getByRole('button', { name: label })).toBeInTheDocument();
    },
  );

  it('closes with the "Show results" button and clears from inside', async () => {
    renderExplorer({ search: '?size=S&color=sand' });

    fireEvent.click(screen.getByRole('button', { name: 'Filters (2)', hidden: true }));
    const dialog = await screen.findByRole('dialog', { name: 'Filters' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear all' }));
    expect(url()).toBe('/en/shop');
    expect(within(dialog).queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Show 12 results' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('closes itself when the window grows to the sidebar breakpoint', async () => {
    const listeners = new Set<() => void>();
    let wide = false;
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        get matches(): boolean {
          return query.includes('min-width') ? wide : false;
        },
        addEventListener: (_type: string, listener: () => void): void => {
          listeners.add(listener);
        },
        removeEventListener: (_type: string, listener: () => void): void => {
          listeners.delete(listener);
        },
      })),
    );
    renderExplorer();

    fireEvent.click(screen.getByRole('button', { name: 'Filters', hidden: true }));
    await screen.findByRole('dialog', { name: 'Filters' });
    act(() => {
      wide = true;
      for (const listener of listeners) listener();
    });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
