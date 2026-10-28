import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import type { ReactElement, ReactNode } from 'react';

import { Breadcrumb, type Crumb } from '@/components/catalogue/breadcrumb';
import { CatalogueExplorer } from '@/components/catalogue/catalogue-explorer';
import { prefetchFor } from '@/components/catalogue/prefetch';
import { ProductCard } from '@/components/catalogue/product-card';
import { QueryHoldScript } from '@/components/catalogue/query-hold-script';
import { Container } from '@/components/ui/container';
import type { CategoryEntry, Locale } from '@/data/schema';
import {
  ALL_COLORS,
  getAllCategories,
  getAllProducts,
  getProductsByCategory,
  toCatalogueItem,
} from '@/lib/catalogue';
import { currencySymbol, type Currency } from '@/lib/money';

// The grid is 2-up on phones, 3-up from md and 4-up from xl, with the 14rem filter sidebar from lg
// (page padding and gaps included): the width a card really gets.
const GRID_SIZES =
  '(min-width: 80rem) 218px, (min-width: 64rem) 22vw, (min-width: 48rem) 30vw, 46vw';

type CollectionViewProps = {
  locale: Locale;
  currency: Currency;
  /** The category page to show, or null for "Shop all". */
  category: CategoryEntry | null;
};

/**
 * "Shop all" and the category pages (FR-020, FR-021, FR-022). A server component: it renders the
 * heading, the breadcrumb and one `ProductCard` per product, then hands them to the interactive
 * island, which filters and sorts them from the URL in the browser (ADR-0006). The page therefore
 * stays static and the first HTML is the full default grid with prices already in the visitor's
 * currency.
 */
export async function CollectionView({
  locale,
  currency,
  category,
}: CollectionViewProps): Promise<ReactElement> {
  const t = await getTranslations({ locale, namespace: 'catalogue' });
  const messages = await getMessages({ locale });
  const products = category === null ? getAllProducts() : getProductsByCategory(category.id);

  const cards: Record<string, ReactNode> = {};
  products.forEach((product, index) => {
    cards[product.slug] = (
      <ProductCard
        product={product}
        locale={locale}
        currency={currency}
        sizes={GRID_SIZES}
        prefetch={false}
        // The first card is what a visitor sees first, so it is the only image fetched eagerly.
        priority={index === 0}
      />
    );
  });

  const crumbs: Crumb[] = [
    { label: t('page.home'), href: '/' },
    category === null
      ? { label: t('page.shop') }
      : { label: t('page.shop'), href: '/shop', prefetch: prefetchFor('shop') },
    ...(category === null ? [] : [{ label: category.name[locale] }]),
  ];

  return (
    <main id="main">
      <Container className="pb-16 pt-2 md:pb-24">
        <Breadcrumb label={t('page.breadcrumbLabel')} crumbs={crumbs} />
        <header className="mt-4">
          <h1 className="text-h1 uppercase-latin">
            {category === null ? t('page.shopTitle') : category.name[locale]}
          </h1>
          <p className="mt-2 text-body text-muted">
            {category === null ? t('page.shopSubtitle') : category.subtitle[locale]}
          </p>
        </header>
        <QueryHoldScript />
        <NextIntlClientProvider locale={locale} messages={{ catalogue: messages.catalogue }}>
          <CatalogueExplorer
            scope={category === null ? null : category.id}
            currency={currency}
            currencySymbol={currencySymbol(currency, locale)}
            items={products.map(toCatalogueItem)}
            cards={cards}
            colors={ALL_COLORS}
            categories={getAllCategories().map(({ id, name }) => ({ id, name: name[locale] }))}
          />
        </NextIntlClientProvider>
      </Container>
    </main>
  );
}
