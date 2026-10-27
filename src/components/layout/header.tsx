import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { CurrencySync } from '@/components/layout/currency-sync';
import { HeaderSurface } from '@/components/layout/header-surface';
import { MobileNav } from '@/components/layout/mobile-nav';
import type { MobileNavContent } from '@/components/layout/mobile-nav-types';
import { categoryLinks, primaryLinks } from '@/components/layout/nav-links';
import { BagIcon } from '@/components/ui/icons/bag-icon';
import { SearchIcon } from '@/components/ui/icons/search-icon';
import { IconButton } from '@/components/ui/icon-button';
import { Wordmark } from '@/components/ui/wordmark';
import type { Locale } from '@/data/schema';
import { Link } from '@/i18n/navigation';

type HeaderProps = { locale: Locale };

const SEARCH_REASON_ID = 'header-search-reason';
const CART_REASON_ID = 'header-cart-reason';

/**
 * Site header (FR-001): hamburger left, wordmark centred, search and cart right. Server-rendered; the
 * client islands are the surface (scroll state) and the menu drawer, which loads on demand.
 */
export async function Header({ locale }: HeaderProps): Promise<ReactElement> {
  const nav = await getTranslations({ locale, namespace: 'nav' });
  const common = await getTranslations({ locale, namespace: 'common' });

  const content: MobileNavContent = {
    openLabel: nav('menu.open'),
    closeLabel: nav('menu.close'),
    title: nav('menu.title'),
    navLabel: nav('menu.mainLabel'),
    primary: primaryLinks({ home: nav('links.home'), shopAll: nav('links.shopAll') }),
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
          {/* Search arrives in phase 2: present and focusable, but inert, and it says why. */}
          <IconButton label={nav('search.label')} disabled disabledReasonId={SEARCH_REASON_ID}>
            <SearchIcon className="size-6" />
          </IconButton>
          <span id={SEARCH_REASON_ID} hidden>
            {nav('search.reason')}
          </span>

          <IconButton label={nav('cart.label')} disabled disabledReasonId={CART_REASON_ID}>
            <BagIcon className="size-6" />
            {/*
              TODO(T10): the item-count badge island renders into this box. The box is reserved now
              (fixed size, absolutely positioned, out of flow) so adding the count later cannot shift
              the header.
            */}
            <span
              aria-hidden="true"
              data-slot="cart-badge"
              className="pointer-events-none absolute end-0 top-0 size-4"
            />
          </IconButton>
          <span id={CART_REASON_ID} hidden>
            {nav('cart.reason')}
          </span>
        </div>
      </div>
    </HeaderSurface>
  );
}
