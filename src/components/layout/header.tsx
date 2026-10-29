import { getMessages, getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { CurrencySync } from '@/components/layout/currency-sync';
import { HeaderSurface } from '@/components/layout/header-surface';
import { MobileNav } from '@/components/layout/mobile-nav';
import type { MobileNavContent } from '@/components/layout/mobile-nav-types';
import { categoryLinks, primaryLinks } from '@/components/layout/nav-links';
import { CartTrigger } from '@/components/cart/cart-trigger';
import { SearchTrigger } from '@/components/search/search-trigger';
import { getSearchIndex } from '@/components/search/search-index';
import { Wordmark } from '@/components/ui/wordmark';
import type { Locale } from '@/data/schema';
import { Link } from '@/i18n/navigation';

type HeaderProps = { locale: Locale };

/**
 * Site header (FR-001): hamburger left, wordmark centred, search and cart right. Server-rendered; the
 * client islands are the surface (scroll state) and the menu drawer, which loads on demand.
 */
export async function Header({ locale }: HeaderProps): Promise<ReactElement> {
  const nav = await getTranslations({ locale, namespace: 'nav' });
  const common = await getTranslations({ locale, namespace: 'common' });

  const messages = await getMessages({ locale });
  const content: MobileNavContent = {
    openLabel: nav('menu.open'),
    closeLabel: nav('menu.close'),
    title: nav('menu.title'),
    navLabel: nav('menu.mainLabel'),
    primary: [
      ...primaryLinks({ home: nav('links.home'), shopAll: nav('links.shopAll') }),
      { href: '/looks', label: nav('links.looks') },
      { href: '/vibes', label: nav('links.vibes') },
      { href: '/journal', label: nav('links.journal') },
    ],
    categoriesHeading: nav('links.categoriesHeading'),
    categories: categoryLinks(locale),
    localeLabel: common('locale.label'),
    localeNames: { en: common('locale.en'), th: common('locale.th') },
    currencyLabel: common('currency.label'),
    currencyNames: { USD: common('currency.USD'), THB: common('currency.THB') },
    currencyAnnouncements: {
      USD: nav('currencyChanged.USD'),
      THB: nav('currencyChanged.THB'),
    },
  };

  return (
    <HeaderSurface>
      <CurrencySync />
      <div className="mx-auto grid h-full w-full max-w-page grid-cols-[auto_1fr_auto] items-center px-0 min-[22.5rem]:grid-cols-[1fr_auto_1fr] min-[23rem]:px-1.5 md:px-3.5 lg:px-7.5">
        <div className="flex justify-start">
          <MobileNav content={content} />
        </div>

        <Link
          href="/"
          // The viewport prefetch would fetch the page we are on (three RSC requests at load, measured).
          prefetch={false}
          aria-label={nav('homeLink')}
          className="inline-flex min-h-11 items-center justify-center justify-self-center rounded-md px-0.5"
        >
          <Wordmark name={common('wordmark.name')} descriptor={common('wordmark.descriptor')} />
        </Link>

        <div className="flex justify-end gap-2">
          <SearchTrigger
            entries={getSearchIndex(locale)}
            locale={locale}
            messages={messages.search}
          />

          <CartTrigger />
        </div>
      </div>
    </HeaderSurface>
  );
}
