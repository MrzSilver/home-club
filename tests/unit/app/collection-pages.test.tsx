import { render, screen, within } from '@testing-library/react';
import { createTranslator } from 'next-intl';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CategoryPage, {
  dynamicParams as categoryDynamicParams,
  generateMetadata as categoryMetadata,
  generateStaticParams as categoryStaticParams,
} from '@/app/[locale]/[currency]/collections/[category]/page';
import ShopPage, {
  dynamicParams as shopDynamicParams,
  generateMetadata as shopMetadata,
  generateStaticParams as shopStaticParams,
} from '@/app/[locale]/[currency]/shop/page';
import { HOLD_SCRIPT } from '@/components/catalogue/query-hold';
import type { CatalogueItem } from '@/lib/catalogue-query';
import en from '@messages/en.json';
import th from '@messages/th.json';
import { resetNavigationMock } from '../helpers/navigation-mock';
import { resolveServerTree } from '../helpers/resolve-server-tree';

const { setRequestLocale, explorerProps, insertedHtml } = vi.hoisted(() => ({
  setRequestLocale: vi.fn(),
  explorerProps: { current: null as null | Record<string, unknown> },
  insertedHtml: { callbacks: [] as Array<() => unknown> },
}));

// `useServerInsertedHTML` only exists while Next.js renders HTML; record what a page registers.
vi.mock('next/navigation', async (importOriginal) => ({
  ...((await importOriginal()) as Record<string, unknown>),
  useServerInsertedHTML: (callback: () => ReactNode): void => {
    insertedHtml.callbacks.push(callback);
  },
}));

vi.mock('next-intl/server', () => ({
  setRequestLocale,
  getMessages: ({ locale }: { locale: 'en' | 'th' }) => Promise.resolve(locale === 'th' ? th : en),
  getTranslations: ({ locale, namespace }: { locale: 'en' | 'th'; namespace: string }) =>
    Promise.resolve(
      createTranslator({
        locale,
        messages: locale === 'th' ? th : en,
        namespace: namespace as never,
      }),
    ),
}));
vi.mock(
  '@/i18n/navigation',
  async () => (await import('../helpers/navigation-mock')).navigationModule,
);
// The island has its own tests; here it only records what the server hands it.
vi.mock('@/components/catalogue/catalogue-explorer', () => ({
  CatalogueExplorer: (props: Record<string, unknown>): ReactElement => {
    explorerProps.current = props;
    return <div data-testid="explorer" />;
  },
}));

const params = (
  locale: string,
  currency: string,
  category?: string,
): Promise<{ locale: string; currency: string; category: string }> =>
  Promise.resolve({ locale, currency, category: category ?? '' });

async function renderShop(locale: 'en' | 'th', currency: string): Promise<void> {
  resetNavigationMock('/shop', locale);
  const tree = await resolveServerTree(await ShopPage({ params: params(locale, currency) }));
  render(tree as ReactNode);
}

async function renderCategory(
  locale: 'en' | 'th',
  currency: string,
  category: string,
): Promise<void> {
  resetNavigationMock('/collections', locale);
  const tree = await resolveServerTree(
    await CategoryPage({ params: params(locale, currency, category) }),
  );
  render(tree as ReactNode);
}

const props = (): Record<string, unknown> => {
  if (explorerProps.current === null) throw new Error('explorer was not rendered');
  return explorerProps.current;
};

beforeEach(() => {
  explorerProps.current = null;
  insertedHtml.callbacks.length = 0;
  setRequestLocale.mockClear();
  resetNavigationMock('/shop', 'en');
});

describe('Shop all page (FR-020, FR-022)', () => {
  it.each(['en', 'th'] as const)(
    'has one h1, the page title and a breadcrumb (%s)',
    async (locale) => {
      await renderShop(locale, locale === 'en' ? 'usd' : 'thb');

      const copy = (locale === 'en' ? en : th).catalogue.page;
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(copy.shopTitle);
      expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
      const crumbs = within(screen.getByRole('navigation', { name: copy.breadcrumbLabel }));
      expect(crumbs.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
        copy.home,
        copy.shop,
      ]);
      expect(crumbs.getByText(copy.shop)).toHaveAttribute('aria-current', 'page');
      expect(crumbs.getByRole('link', { name: copy.home })).toHaveAttribute('href', `/${locale}`);
      expect(setRequestLocale).toHaveBeenCalledWith(locale);
    },
  );

  it('hands the island all 12 products as plain data, one server-rendered card each, in data order', async () => {
    await renderShop('en', 'usd');

    const { items, cards, scope, currency, categories, colors } = props() as {
      items: CatalogueItem[];
      cards: Record<string, ReactNode>;
      scope: string | null;
      currency: string;
      categories: { id: string; name: string }[];
      colors: { id: string }[];
    };
    expect(items).toHaveLength(12);
    expect(items[0]?.slug).toBe('essential-tee');
    expect(Object.keys(cards)).toEqual(items.map((item) => item.slug));
    expect(scope).toBeNull();
    expect(currency).toBe('USD');
    expect((props() as { currencySymbol: string }).currencySymbol).toBe('$');
    expect(categories.map((category) => category.name)).toEqual([
      'Foundations',
      'Performance',
      'Lifestyle',
      'Accessories',
    ]);
    expect(colors.map((color) => color.id)).toContain('forest');
    // Plain JSON only: nothing in `items` is a function, and descriptions and images stay on the server.
    expect(JSON.parse(JSON.stringify(items))).toEqual(items);
    expect(JSON.stringify(items)).not.toMatch(/description|"images"|\.webp/);
  });

  it('renders the cards with prices already in the page currency, only the first with a priority image', async () => {
    await renderShop('en', 'thb');
    const { cards } = props() as { cards: Record<string, ReactElement> };

    const first = await resolveServerTree(cards['essential-tee']);
    render(first as ReactNode);
    expect(screen.getByTestId('product-price')).toHaveTextContent('฿1,715');
    expect(screen.getByTestId('product-price')).toHaveAttribute('data-currency', 'THB');
    expect((cards['essential-tee'] as ReactElement<{ priority: boolean }>).props.priority).toBe(
      true,
    );
    expect((cards['premium-hoodie'] as ReactElement<{ priority: boolean }>).props.priority).toBe(
      false,
    );
  });

  it('adds the pre-paint hold through server-inserted HTML only, not as a script in the tree', async () => {
    await renderShop('en', 'usd');

    expect(document.querySelectorAll('script')).toHaveLength(0);
    expect(insertedHtml.callbacks).toHaveLength(1);
    const callback = insertedHtml.callbacks[0];
    const inserted = callback?.() as ReactElement<{ children: string }>;
    expect(inserted.type).toBe('script');
    expect(inserted.props.children).toBe(HOLD_SCRIPT);
    // Next.js calls it again at every flush of the stream; the script must not be repeated.
    expect(callback?.()).toBeNull();
    expect(callback?.()).toBeNull();
  });

  it('builds localized metadata with the public canonical and hreflang paths, no query (FR-071)', async () => {
    const english = await shopMetadata({ params: params('en', 'usd') });
    expect(english.title).toBe('Shop all');
    expect(english.description).toBe(en.seo.shopDescription);
    expect(english.alternates).toEqual({
      canonical: '/en/shop',
      languages: { en: '/en/shop', th: '/th/shop', 'x-default': '/en/shop' },
    });
    const thai = await shopMetadata({ params: params('th', 'thb') });
    expect(thai.title).toBe(th.seo.shopTitle);
    expect(thai.alternates?.canonical).toBe('/th/shop');
    expect(JSON.stringify([english, thai])).not.toMatch(/\/(usd|thb)\b/);
  });

  it('is prerendered for every locale and currency, and never rendered on demand (ADR-0003)', () => {
    expect(shopStaticParams()).toEqual([
      { locale: 'en', currency: 'usd' },
      { locale: 'en', currency: 'thb' },
      { locale: 'th', currency: 'usd' },
      { locale: 'th', currency: 'thb' },
    ]);
    expect(shopDynamicParams).toBe(false);
  });

  it('answers 404 for a locale or currency the router should never pass', async () => {
    await expect(ShopPage({ params: params('fr', 'usd') })).rejects.toBeDefined();
    await expect(ShopPage({ params: params('en', 'eur') })).rejects.toBeDefined();
  });
});

describe('category page (FR-020)', () => {
  it('shows the category name as the one h1, its subtitle, and Home > Shop > Category', async () => {
    await renderCategory('en', 'usd', 'foundations');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Foundations');
    expect(screen.getByText('The basics')).toBeInTheDocument();
    const crumbs = within(
      screen.getByRole('navigation', { name: en.catalogue.page.breadcrumbLabel }),
    );
    expect(crumbs.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Home',
      'Shop',
      'Foundations',
    ]);
    expect(crumbs.getByRole('link', { name: 'Shop' })).toHaveAttribute('href', '/en/shop');
    expect(crumbs.getByText('Foundations')).toHaveAttribute('aria-current', 'page');
  });

  it('hands the island only that category, scoped, in Thai when asked', async () => {
    await renderCategory('th', 'thb', 'accessories');

    const { items, scope } = props() as { items: CatalogueItem[]; scope: string };
    expect(scope).toBe('accessories');
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.category === 'accessories')).toBe(true);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('แอคเซสซอรี่');
  });

  it.each(['nope', 'Foundations', '__proto__', ''])(
    'answers 404 for the category %j',
    async (slug) => {
      await expect(CategoryPage({ params: params('en', 'usd', slug) })).rejects.toBeDefined();
      await expect(categoryMetadata({ params: params('en', 'usd', slug) })).rejects.toBeDefined();
    },
  );

  it('is prerendered for every locale x currency x category and never on demand', () => {
    const all = categoryStaticParams();
    expect(all).toHaveLength(2 * 2 * 4);
    expect(all).toContainEqual({ locale: 'th', currency: 'thb', category: 'lifestyle' });
    expect(categoryDynamicParams).toBe(false);
  });

  it('describes the page with the real product count, localized, with public paths only', async () => {
    const english = await categoryMetadata({ params: params('en', 'usd', 'accessories') });
    expect(english.title).toBe('Accessories');
    expect(english.description).toMatch(
      /^The finishing touch\. Browse \d+ products? in Accessories /,
    );
    expect(english.alternates).toEqual({
      canonical: '/en/collections/accessories',
      languages: {
        en: '/en/collections/accessories',
        th: '/th/collections/accessories',
        'x-default': '/en/collections/accessories',
      },
    });
    const thai = await categoryMetadata({ params: params('th', 'thb', 'accessories') });
    expect(thai.title).toBe('แอคเซสซอรี่');
    expect(thai.description).toContain('รายการ');
    expect(JSON.stringify([english, thai])).not.toMatch(/\/(usd|thb)\b/);
  });
});
